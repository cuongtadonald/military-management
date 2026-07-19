/**
 * File: app/api/units/debug/route.ts
 * Mô tả: API debug để kiểm tra dữ liệu đơn vị trả về
 * Cập nhật: 2026-07-03
 * 
 * Sử dụng: Gọi GET /api/units/debug?userId=U001
 * để kiểm tra xem API trả về đúng dữ liệu không
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'U001';

    const pool = await getPool();

    // Kiểm tra cấu trúc bảng
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'OrganizationUnit'
      ORDER BY ORDINAL_POSITION
    `);

    // Lấy dữ liệu mẫu
    const sampleResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT TOP 10
          UnitID,
          UnitName,
          UnitShortName,
          UnitLevel,
          ParentUnitID,
          HierarchyPath,
          FullPathName
        FROM OrganizationUnit
        ORDER BY UnitLevel, UnitName
      `);

    // Kiểm tra user
    const userResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT u.UserID, u.Username, u.RoleID, u.UnitID, ou.HierarchyPath
        FROM [User] u
        LEFT JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.UserID = @userId
      `);

    // Đếm tổng số đơn vị
    const countResult = await pool.request()
      .query('SELECT COUNT(*) as total FROM OrganizationUnit');

    return NextResponse.json({
      success: true,
      data: {
        tableColumns: columnsResult.recordset,
        sampleData: sampleResult.recordset,
        userInfo: userResult.recordset[0] || null,
        totalUnits: countResult.recordset[0].total,
      },
    });
  } catch (error) { 
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Debug error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}