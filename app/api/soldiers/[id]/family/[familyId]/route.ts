/**
 * File: app/api/soldiers/[id]/family/[familyId]/route.ts
 * Mô tả: API PUT/DELETE thân nhân theo FamilyID
 * Cập nhật: 2026-07-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * PUT /api/soldiers/[id]/family/[familyId]
 * Cập nhật thông tin thân nhân
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; familyId: string }> }
) {
  try {
    const { id, familyId } = await params;
    const body = await request.json();

    const pool = await getPool();

    await pool.request()
      .input('FamilyID', sql.VarChar, familyId)
      .input('SoldierID', sql.VarChar, id)
      .input('FullName', sql.NVarChar, body.FullName)
      .input('Relationship', sql.NVarChar, body.Relationship)
      .input('DateOfBirth', sql.Date, body.DateOfBirth)
      .input('Occupation', sql.NVarChar, body.Occupation)
      .input('Workplace', sql.NVarChar, body.Workplace)
      .input('PhoneNumber', sql.VarChar, body.PhoneNumber)
      .input('Address', sql.NVarChar, body.Address)
      .input('IsDependent', sql.Bit, body.IsDependent ? 1 : 0)
      .query(`
        UPDATE SoldierFamily
        SET 
          FullName = @FullName,
          Relationship = @Relationship,
          DateOfBirth = @DateOfBirth,
          Occupation = @Occupation,
          Workplace = @Workplace,
          PhoneNumber = @PhoneNumber,
          Address = @Address,
          IsDependent = @IsDependent
        WHERE FamilyID = @FamilyID AND SoldierID = @SoldierID
      `);

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật thân nhân',
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật thân nhân' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/soldiers/[id]/family/[familyId]
 * Xóa thân nhân
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; familyId: string }> }
) {
  try {
    const { id, familyId } = await params;

    const pool = await getPool();

    await pool.request()
      .input('FamilyID', sql.VarChar, familyId)
      .input('SoldierID', sql.VarChar, id)
      .query(`
        DELETE FROM SoldierFamily
        WHERE FamilyID = @FamilyID AND SoldierID = @SoldierID
      `);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa thân nhân',
    });
  } catch (error) {
    console.error('Lỗi khi xóa thân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa thân nhân' },
      { status: 500 }
    );
  }
}