/**
 * File: app/api/permissions/route.ts
 * Mô tả: API quản lý quyền chi tiết cho từng tính năng
 * Cập nhật: 2026-07-03
 * 
 * GET: Lấy danh sách permission của user
 * POST: Cập nhật permission (bật/tắt) + trả về danh sách user cần refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { createChangeHistory, FEATURE_LABELS, setUserPermission } from '@/lib/audit';

/**
 * GET /api/permissions?userId=U001
 * Lấy tất cả permission của user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const targetUserId = searchParams.get('targetUserId') || '';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Nếu có targetUserId → lấy permission của user đó (để admin quản lý)
    // Nếu không → lấy permission của chính user đó
    const queryUserId = targetUserId || userId;

    const result = await pool.request()
      .input('userId', sql.VarChar, queryUserId)
      .query(`
        SELECT 
          PermissionID,
          GrantedByUserID,
          GrantedToUserID,
          FeatureCode,
          IsEnabled,
          GrantedDate,
          LastModifiedDate,
          LastModifiedBy
        FROM UserFeaturePermission
        WHERE GrantedToUserID = @userId
        ORDER BY FeatureCode
      `);

    // Convert sang object { featureCode: isEnabled }
    const permissions: Record<string, boolean> = {};
    result.recordset.forEach((row: any) => {
      permissions[row.FeatureCode] = !!row.IsEnabled;
    });

    return NextResponse.json({
      success: true,
      data: permissions,
      userId: queryUserId,
    });
  } catch (error) {
    console.error('Lỗi khi lấy permission:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải quyền' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/permissions
 * Cập nhật permission (bật/tắt)
 * Body: { grantedByUserId, grantedToUserId, featureCode, isEnabled }
 * 
 * Response: { success, message, affectedUserIds: [danh sách user cần refresh] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grantedByUserId, grantedToUserId, featureCode, isEnabled } = body;

    if (!grantedByUserId || !grantedToUserId || !featureCode) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const permissionChange = await setUserPermission(
      pool,
      grantedByUserId,
      grantedToUserId,
      featureCode,
      Boolean(isEnabled),
    );

    // await createChangeHistory({
    //   pool,
    //   changedBy: grantedByUserId,
    //   changeType: 'PERMISSION',
    //   changeReason: isEnabled ? 'Cấp quyền trực tiếp' : 'Thu hồi quyền trực tiếp',
    //   description: `${isEnabled ? 'Bật' : 'Tắt'} quyền ${FEATURE_LABELS[featureCode] || featureCode} cho user ${grantedToUserId}`,
    //   totalSoldier: 0,
    //   details: [{
    //     soldierId: null,
    //     fieldName: featureCode,
    //     fieldDisplayName: FEATURE_LABELS[featureCode] || featureCode,
    //     oldValue: permissionChange.oldValue,
    //     newValue: Boolean(isEnabled),
    //   }],
    // });

    // Lấy thông tin user bị ảnh hưởng để trả về cho frontend
    const userInfoResult = await pool.request()
      .input('grantedToUserId', sql.VarChar, grantedToUserId)
      .query(`
        SELECT 
          u.UserID,
          u.FullName,
          u.Username,
          u.RoleID,
          r.RoleName,
          u.UnitID,
          ou.UnitName,
          ou.UnitLevel,
          ou.HierarchyPath
        FROM [User] u
        LEFT JOIN Role r ON u.RoleID = r.RoleID
        LEFT JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.UserID = @grantedToUserId
      `);

    const affectedUser = userInfoResult.recordset[0];

    return NextResponse.json({
      success: true,
      message: isEnabled ? 'Đã bật quyền' : 'Đã tắt quyền',
      affectedUser: affectedUser ? {
        userId: affectedUser.UserID,
        fullName: affectedUser.FullName,
        username: affectedUser.Username,
        unitName: affectedUser.UnitName,
        unitLevel: affectedUser.UnitLevel,
      } : null,
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật permission:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật quyền' },
      { status: 500 }
    );
  }
}