/**
 * File: app/api/subordinate-users/route.ts
 * Mô tả: API lấy danh sách user cấp con để gửi thông báo
 * Sử dụng SP: W01P0004
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * GET /api/subordinate-users
 * Lấy danh sách user cấp con của user hiện tại
 */
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

    // Gọi SP W01P0004 để lấy danh sách user cấp con
    const result = await pool.request()
      .input('UserID', sql.VarChar(50), userId)
      .execute('W01P0004');

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách user cấp con:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi tải dữ liệu',
      },
      { status: 500 }
    );
  }
}
