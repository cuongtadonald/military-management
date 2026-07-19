/**
 * File: app/api/auth/login/route.ts
 * Mô tả: API đăng nhập - trả về thông tin user + permissionLevel
 * Cập nhật: 2026-07-10 - Thêm PermissionLevel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin đăng nhập' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Query user với thông tin role, unit và permissionLevel
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          u.UserID,
          u.FullName,
          u.Username,
          u.RoleID,
          r.RoleName,
          u.PermissionLevel,
          u.UnitID,
          ou.UnitName,
          ou.UnitLevel,
          ou.HierarchyPath
        FROM [User] u
        LEFT JOIN Role r ON u.RoleID = r.RoleID
        LEFT JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.Username = @username AND u.PasswordHash = @password
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        userId: user.UserID,
        fullName: user.FullName,
        username: user.Username,
        roleId: user.RoleID,
        roleName: user.RoleName,
        permissionLevel: user.PermissionLevel || 4, // MỚI: Mức phân quyền
        unitId: user.UnitID,
        unitName: user.UnitName,
        unitLevel: user.UnitLevel || 3,
        hierarchyPath: user.HierarchyPath || '',
      },
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}