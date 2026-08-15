/**
 * File: app/api/notifications/stream/route.ts
 * Mô tả: SSE endpoint cho realtime notifications
 * Client connect bằng EventSource, server push khi có thông báo mới
 */

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

// Disable caching và buffering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Track last notification time cho mỗi user (in-memory)
const userLastCheck = new Map<string, Date>();

// Poll interval (3 giây)
const POLL_INTERVAL = 3000;

/**
 * GET /api/notifications/stream?userId=xxx
 * SSE stream cho realtime notifications
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  // Khởi tạo last check time nếu chưa có
  if (!userLastCheck.has(userId)) {
    userLastCheck.set(userId, new Date());
  }

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Hàm gửi SSE event
      const sendEvent = (data: any) => {
        if (isClosed) return;
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (e) {
          // Stream đã đóng
          isClosed = true;
        }
      };

      // Gửi heartbeat mỗi 15 giây để giữ connection
      const heartbeatInterval = setInterval(() => {
        sendEvent({ type: 'heartbeat', timestamp: Date.now() });
      }, 15000);

      // Poll DB mỗi POLL_INTERVAL
      const pollInterval = setInterval(async () => {
        if (isClosed) return;

        try {
          const pool = await getPool();
          const lastCheck = userLastCheck.get(userId) || new Date();

          // Kiểm tra có thông báo mới không
          const result = await pool.request()
            .input('userId', sql.VarChar(50), userId)
            .input('since', sql.DateTime, lastCheck)
            .query(`
              SELECT COUNT(*) as count
              FROM Notifications
              WHERE (
                RecipientUserID = @userId
                OR IsGlobal = 1
              )
              AND CreatedAt > @since
              AND IsRead = 0
            `);

          const newCount = result.recordset[0]?.count || 0;

          if (newCount > 0) {
            // Cập nhật last check time
            userLastCheck.set(userId, new Date());

            // Push event cho client
            sendEvent({
              type: 'new_notification',
              count: newCount,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('SSE poll error:', error);
        }
      }, POLL_INTERVAL);

      // Cleanup khi stream đóng
      const cleanup = () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        userLastCheck.delete(userId);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      };

      // Gửi event kết nối thành công
      sendEvent({ type: 'connected', userId, timestamp: Date.now() });

      // Lắng nghe khi client disconnect
      request.signal.addEventListener('abort', cleanup);
    },

    cancel() {
      isClosed = true;
      userLastCheck.delete(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
