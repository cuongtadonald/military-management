/**
 * File: app/api/permissions/users/route.ts
 * Mô tả: API lấy danh sách user cấp dưới để quản lý quyền
 * Cập nhật: 2026-07-11 - Dùng stored procedure W01P0004 và join thêm OrganizationUnit
 * 
 * GET: Lấy danh sách user cấp dưới bằng cách gọi SP W01P0004
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * GET /api/permissions/users?userId=U001
 * Lấy danh sách user cấp dưới bằng stored procedure W01P0004
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

    // Lấy thông tin user hiện tại
    const currentUserResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT 
          u.UserID,
          u.FullName,
          u.PermissionLevel,
          u.RoleID,
          r.RoleName,
          u.UnitID,
          ou.UnitName,
          ou.UnitLevel,
          ou.HierarchyPath
        FROM [User] u
        LEFT JOIN Role r ON u.RoleID = r.RoleID
        LEFT JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.UserID = @userId
      `);

    if (currentUserResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy user' },
        { status: 404 }
      );
    }

    const currentUser = currentUserResult.recordset[0];

    // Gọi stored procedure W01P0004 để lấy danh sách user cấp dưới
    const subordinateUsersResult = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .query(`
        DECLARE @CurrentUnitID VARCHAR(50)
        DECLARE @CurrentHierarchyPath VARCHAR(1000)
        
        -- Lấy UnitID của user hiện tại
        SELECT @CurrentUnitID = UnitID FROM [User] WHERE UserID = @UserID
        
        -- Lấy HierarchyPath của đơn vị hiện tại
        SELECT @CurrentHierarchyPath = HierarchyPath FROM OrganizationUnit WHERE UnitID = @CurrentUnitID
        
        -- Lấy danh sách user cấp dưới
        SELECT 
          U.UserID,
          U.Username,
          U.FullName,
          R.RoleName,
          U.UnitID,
          U.PermissionLevel,
          ou.UnitName,
          ou.UnitLevel,
          ou.FullPathName AS UnitFullPath
        FROM [User] U
        LEFT JOIN Role R ON U.RoleID = R.RoleID
        LEFT JOIN OrganizationUnit ou ON U.UnitID = ou.UnitID
        WHERE ou.HierarchyPath LIKE @CurrentHierarchyPath + '%'
        AND ou.UnitID <> @CurrentUnitID
      `);

    // Lấy permission hiện tại của các user cấp dưới
    const permissionsResult = await pool.request()
      .query(`
        SELECT 
          GrantedToUserID,
          FeatureCode,
          IsEnabled
        FROM UserFeaturePermission
      `);

    // Group permission by userId
    const permissionsMap: Record<string, Record<string, boolean>> = {};
    permissionsResult.recordset.forEach((row: any) => {
      if (!permissionsMap[row.GrantedToUserID]) {
        permissionsMap[row.GrantedToUserID] = {};
      }
      permissionsMap[row.GrantedToUserID][row.FeatureCode] = !!row.IsEnabled;
    });
    // Merge permission vào user list
    const usersWithPermissions = subordinateUsersResult.recordset.map((user: any) => ({
      ...user,
      permissions: permissionsMap[user.UserID] || {},
    }));

    return NextResponse.json({
      success: true,
      data: {
        currentUser,
        subordinateUsers: usersWithPermissions,
      },
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách user:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu' },
      { status: 500 }
    );
  }
}