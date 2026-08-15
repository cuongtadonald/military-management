import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

/**
 * API Route: /api/notifications
 * Xử lý thông báo trong hệ thống
 */

// GET: Lấy danh sách thông báo của user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");

    const limit = Number(searchParams.get("limit") || 50);

    const offset = Number(searchParams.get("offset") || 0);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Thiếu userId" },
        { status: 400 }
      );
    }

    const notifications = await executeQuery(
      `
      SELECT
          n.NotificationID,
          n.Title,
          n.Content,
          n.NotificationType,
          n.CreatedAt,
          n.IsRead,
          u.FullName AS SenderName
      FROM Notifications n
      LEFT JOIN [User] u
          ON n.CreatedBy = u.UserID
      WHERE
          n.RecipientUserID = @userId
          OR n.TargetUnitID = (
              SELECT UnitID
              FROM [User]
              WHERE UserID = @userId
          )
          OR n.IsGlobal = 1
      ORDER BY n.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `,
      {
        userId,
        offset,
        limit,
      }
    );

    const unread = await executeQuery(
      `
      SELECT COUNT(*) AS count
      FROM Notifications n
      WHERE
          (
              n.RecipientUserID = @userId
              OR n.TargetUnitID = (
                  SELECT UnitID
                  FROM [User]
                  WHERE UserID = @userId
              )
              OR n.IsGlobal = 1
          )
          AND n.IsRead = 0
    `,
      { userId }
    );

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount: unread[0]?.count ?? 0,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi tải thông báo",
      },
      {
        status: 500,
      }
    );
  }
} 

// POST: Tạo thông báo mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, senderId, targetUserIds, isGlobal, notificationType } = body;

    if (!title || !content || !senderId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Tạo notification ID
    const notificationId = `NOT${Date.now()}`;

    if (isGlobal) {
      // Gửi toàn hệ thống - tạo 1 bản ghi với IsGlobal = 1
      await executeQuery(`
        INSERT INTO Notifications (
          NotificationID, Title, Content, NotificationType,
          CreatedBy, CreatedAt, IsRead, IsGlobal
        ) VALUES (
          @notificationId, @title, @content, @notificationType,
          @senderId, GETDATE(), 0, 1
        )
      `, { notificationId, title, content, senderId, notificationType: notificationType || 'INFO' });
    } else if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // Gửi đến danh sách user cấp con (từ W01P0004)
      for (const userId of targetUserIds) {
        const notifId = `NOT${Date.now()}${userId}`;
        await executeQuery(`
          INSERT INTO Notifications (
            NotificationID, Title, Content, NotificationType,
            CreatedBy, RecipientUserID, CreatedAt, IsRead, IsGlobal
          ) VALUES (
            @notifId, @title, @content, @notificationType,
            @senderId, @userId, GETDATE(), 0, 0
          )
        `, {
          notifId, title, content, senderId,
          userId,
          notificationType: notificationType || 'INFO'
        });
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Phải chọn phạm vi gửi' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi thông báo thành công'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tạo thông báo' },
      { status: 500 }
    );
  }
}

// PUT: Đánh dấu đã đọc
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId } = body;

    if (!notificationId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin' },
        { status: 400 }
      );
    }

    await executeQuery(`
      UPDATE Notifications
      SET IsRead = 1, ReadAt = GETDATE()
      WHERE NotificationID = @notificationId
    `, { notificationId });

    return NextResponse.json({
      success: true,
      message: 'Đã đánh dấu đã đọc'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật' },
      { status: 500 }
    );
  }
}
