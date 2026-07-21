/**
 * File: app/api/soldiers/[id]/route.ts
 * Mô tả: API chi tiết quân nhân - gọi SP W01P0003
 * Cập nhật: 2026-07-03
 * 
 * W01P0003:
 *   - Mode 0: Thông tin chi tiết quân nhân
 *   - Mode 1: Thông tin thân nhân (gia đình)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { createChangeHistory, getUserScope } from '@/lib/audit';


const FIELD_LABELS: Record<string, string> = {
  FullName: 'Họ và tên',
  DateOfBirth: 'Ngày sinh',
  Gender: 'Giới tính',
  CitizenID: 'CCCD',
  Ethnicity: 'Dân tộc',
  Height: 'Chiều cao',
  Weight: 'Cân nặng',
  BloodPressure: 'Huyết áp',
  BloodType: 'Nhóm máu',
  HealthClassification: 'Phân loại sức khỏe',
  EnlistmentDate: 'Ngày nhập ngũ',
  Hometown: 'Quê quán',
  Address: 'Địa chỉ',
  EducationLevel: 'Trình độ học vấn',
  Specialization: 'Chuyên môn',
  PoliticalLevel: 'Trình độ chính trị',
  PartyJoinDate: 'Ngày vào Đảng',
  YouthUnionJoinDate: 'Ngày vào Đoàn',
  Position: 'Chức vụ',
  UnitID: 'Đơn vị',
  RankID: 'Cấp bậc',
  StatusID: 'Trạng thái',
  ReligionID: 'Tôn giáo',
  MaritalStatusID: 'Tình trạng hôn nhân',
  WardID: 'Xã/Phường',
  ProvinceID: 'Tỉnh/Thành phố',
}

function normalizeValue(value: any) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return value ?? null
}

/**
 * GET /api/soldiers/[id]
 * Lấy chi tiết quân nhân theo SoldierID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Gọi SP W01P0003 Mode 0 - Thông tin chi tiết
    const detailResult = await pool.request()
      .input('SoldierID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 0)
      .execute('W01P0003');

    if (detailResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy quân nhân' },
        { status: 404 }
      );
    }

    const soldierDetail = detailResult.recordset[0];

    // Gọi SP W01P0003 Mode 1 - Thông tin thân nhân
    const familyResult = await pool.request()
      .input('SoldierID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 1)
      .execute('W01P0003');

    // Gọi SP W01P0003 Mode 3 - Quá trình công tác
    const workProcessResult = await pool.request()
      .input('SoldierID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 3)
      .execute('W01P0003');

    // Gọi SP W01P0003 Mode 4 - Quá trình đào tạo
    const trainingProcessResult = await pool.request()
      .input('SoldierID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 4)
      .execute('W01P0003');

    return NextResponse.json({
      success: true,
      data: {
        ...soldierDetail,
        family: familyResult.recordset || [],
        workProcesses: workProcessResult.recordset || [],
        trainingProcesses: trainingProcessResult.recordset || [],
      },
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết quân nhân:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi tải dữ liệu',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/soldiers/[id]
 * Cập nhật thông tin quân nhân
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Kiểm tra PermissionLevel - chỉ user có PermissionLevel = 2 mới được sửa
    const modifiedBy = body.LastModifiedBy || body.UpdatedBy || body.ModifiedBy || body.userId;
    if (modifiedBy) {
      const userScope = await getUserScope(pool, modifiedBy);
      if (!userScope || userScope.PermissionLevel !== 2) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền thực hiện thao tác này' },
          { status: 403 }
        );
      }
    }

    // Check xem quân nhân có tồn tại không
    const checkResult = await pool
      .request()
      .input('soldierId', sql.VarChar, id)
      .query('SELECT * FROM Soldier WHERE SoldierID = @soldierId');

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy quân nhân để cập nhật' },
        { status: 404 }
      );
    }

    // Xây dựng câu UPDATE động
    const updateFields: string[] = [];
    const requestObj = pool.request();

    const allowedFields = [
      'FullName', 'DateOfBirth', 'Gender', 'CitizenID', 'Ethnicity',
      'Height', 'Weight', 'BloodPressure', 'BloodType', 'HealthClassification',
      'EnlistmentDate', 'Hometown', 'Address', 'EducationLevel',
      'Specialization', 'PoliticalLevel', 'PartyJoinDate', 'YouthUnionJoinDate',
      'Position', 'UnitID', 'RankID', 'StatusID', 'ReligionID',
      'MaritalStatusID', 'WardID', 'ProvinceID', 'LastModifiedBy',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        let sqlType: any = sql.NVarChar;
        if (['Height', 'Weight'].includes(field)) {
          sqlType = sql.Int;
        } else if (['DateOfBirth', 'EnlistmentDate', 'PartyJoinDate', 'YouthUnionJoinDate'].includes(field)) {
          sqlType = sql.Date;
        } else if (field === 'Gender') {
          sqlType = sql.TinyInt;
        }

        requestObj.input(field, sqlType, body[field]);
        updateFields.push(`${field} = @${field}`);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không có trường nào để cập nhật' },
        { status: 400 }
      );
    }

    updateFields.push('LastModifiedDate = GETDATE()');

    const updateQuery = `
      UPDATE Soldier
      SET ${updateFields.join(', ')}
      WHERE SoldierID = @soldierId
    `;

    requestObj.input('soldierId', sql.VarChar, id);
    await requestObj.query(updateQuery);

    const oldSoldier = checkResult.recordset[0];
    const changedFields = allowedFields
      .filter((field) => field !== 'LastModifiedBy' && body[field] !== undefined)
      .filter((field) => normalizeValue(oldSoldier[field]) !== normalizeValue(body[field]));

    await createChangeHistory({
      pool,
      changedBy: body.LastModifiedBy || body.UpdatedBy || body.ModifiedBy || body.userId,
      changeType: 'UPDATE',
      changeReason: body.ChangeReason || 'Cập nhật thông tin chiến sĩ',
      description: `Cập nhật chiến sĩ ${oldSoldier.FullName || id}`,
      totalSoldier: 1,
      details: changedFields.map((field) => ({
        soldierId: id,
        fieldName: field,
        fieldDisplayName: FIELD_LABELS[field] || field,
        oldValue: oldSoldier[field],
        newValue: body[field],
      })),
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thành công',
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật quân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật dữ liệu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/soldiers/[id]
 * Xóa quân nhân (hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Kiểm tra PermissionLevel - chỉ user có PermissionLevel = 2 mới được xóa
    const userScope = await getUserScope(pool, userId);
    if (!userScope || userScope.PermissionLevel !== 2) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      );
    }

    // Check xem quân nhân có tồn tại không
    const checkResult = await pool
      .request()
      .input('soldierId', sql.VarChar, id)
      .query('SELECT * FROM Soldier WHERE SoldierID = @soldierId');

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy quân nhân để xóa' },
        { status: 404 }
      );
    }

    const deletedSoldier = checkResult.recordset[0];

    // Xóa thân nhân trước
    await pool
      .request()
      .input('soldierId', sql.VarChar, id)
      .query('DELETE FROM SoldierFamily WHERE SoldierID = @soldierId');

    // Xóa quân nhân
    await pool
      .request()
      .input('soldierId', sql.VarChar, id)
      .query('DELETE FROM Soldier WHERE SoldierID = @soldierId');

    await createChangeHistory({
      pool,
      changedBy: userId,
      changeType: 'DELETE',
      changeReason: 'Xóa chiến sĩ',
      description: `Xóa chiến sĩ ${deletedSoldier.FullName || id}`,
      totalSoldier: 1,
      details: [
        { soldierId: id, fieldName: 'FullName', fieldDisplayName: 'Họ và tên', oldValue: deletedSoldier.FullName, newValue: null },
        { soldierId: id, fieldName: 'CitizenID', fieldDisplayName: 'CCCD', oldValue: deletedSoldier.CitizenID, newValue: null },
        { soldierId: id, fieldName: 'UnitID', fieldDisplayName: 'Đơn vị', oldValue: deletedSoldier.UnitID, newValue: null },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa khỏi hệ thống',
    });
  } catch (error) {
    console.error('Lỗi khi xóa quân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa dữ liệu' },
      { status: 500 }
    );
  }
}