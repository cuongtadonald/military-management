/**
 * File: app/api/auth/refresh-permission/route.ts
 * Mô tả: API refresh PermissionLevel của user hiện tại
 * Cập nhật: 2026-07-21
 * 
 * GET: Query PermissionLevel mới nhất từ bảng User
 * Dùng khi permission thay đổi (toggle on/off) để cập nhật UI realtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT PermissionLevel
        FROM [User]
        WHERE UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy user' },
        { status: 404 }
      );
    }

    const permissionLevel = result.recordset[0].PermissionLevel;

    return NextResponse.json({
      success: true,
      data: {
        permissionLevel: permissionLevel || 3,
      },
    });
  } catch (error) {
    console.error('Lỗi khi refresh permission:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}