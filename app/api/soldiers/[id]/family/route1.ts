/**
 * File: app/api/soldiers/[id]/family/route.ts
 * Mô tả: API CRUD thân nhân (SoldierFamily)
 * Cập nhật: 2026-07-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * GET /api/soldiers/[id]/family
 * Lấy danh sách thân nhân của chiến sĩ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pool = await getPool();

    const result = await pool.request()
      .input('soldierId', sql.VarChar, id)
      .query(`
        SELECT
          FamilyID,
          FullName,
          Relationship,
          DateOfBirth,
          Occupation,
          Workplace,
          PhoneNumber,
          Address,
          IsDependent
        FROM SoldierFamily
        WHERE SoldierID = @soldierId
        ORDER BY 
          CASE Relationship
            WHEN N'Cha' THEN 1
            WHEN N'Bố' THEN 1
            WHEN N'Mẹ' THEN 2
            WHEN N'Vợ' THEN 3
            WHEN N'Chồng' THEN 3
            WHEN N'Con trai' THEN 4
            WHEN N'Con gái' THEN 4
            WHEN N'Con' THEN 4
            WHEN N'Anh trai' THEN 5
            WHEN N'Anh' THEN 5
            WHEN N'Chị gái' THEN 6
            WHEN N'Chị' THEN 6
            WHEN N'Em trai' THEN 7
            WHEN N'Em gái' THEN 7
            WHEN N'Em' THEN 7
            ELSE 99 
          END, 
          FullName
      `);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/soldiers/[id]/family
 * Thêm thân nhân mới
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const pool = await getPool();

    // Sinh FamilyID tự động
    const maxIdResult = await pool.request()
      .query(`
        SELECT MAX(CAST(SUBSTRING(FamilyID, 3, LEN(FamilyID) - 2) AS INT)) as MaxNum
        FROM SoldierFamily
        WHERE FamilyID LIKE 'FM%'
      `);

    const maxNum = maxIdResult.recordset[0]?.MaxNum || 0;
    const newFamilyID = `FM${String(maxNum + 1).padStart(4, '0')}`;

    await pool.request()
      .input('FamilyID', sql.VarChar, newFamilyID)
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
        INSERT INTO SoldierFamily (
          FamilyID, SoldierID, FullName, Relationship, DateOfBirth,
          Occupation, Workplace, PhoneNumber, Address, IsDependent
        ) VALUES (
          @FamilyID, @SoldierID, @FullName, @Relationship, @DateOfBirth,
          @Occupation, @Workplace, @PhoneNumber, @Address, @IsDependent
        )
      `);

    return NextResponse.json({
      success: true,
      message: 'Đã thêm thân nhân',
      data: { FamilyID: newFamilyID },
    });
  } catch (error) {
    console.error('Lỗi khi thêm thân nhân:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi thêm thân nhân' },
      { status: 500 }
    );
  }
}