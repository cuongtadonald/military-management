/**
 * File: app/api/soldiers/route.ts
 * Mô tả: API danh sách quân nhân (GET) và thêm mới (POST)
 * Cập nhật: 2026-07-03
 * 
 * GET: Gọi SP W01P0001 để lấy danh sách
 * POST: Thêm chiến sĩ mới vào bảng Soldier
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { createChangeHistory } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const mode = searchParams.get('mode') || '0';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const unitId = (searchParams.get('unitId') || '').trim();
    const unitPath = (searchParams.get('unitPath') || '').trim();
    const page = Math.max(Number(searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || '20'), 1), 200);
    const exportExcel = searchParams.get("export") === "true";
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Gọi Stored Procedure W01P0001
    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('Mode', sql.VarChar, mode)
      .execute('W01P0001');

    // Map dữ liệu: đổi tên trường để frontend sử dụng
    let mappedData = result.recordset.map((row: any) => ({
      ...row,
      // Map HierarchyPath → UnitHierarchyPath (cho frontend filter)
      UnitHierarchyPath: row.HierarchyPath || '',
      // Map FullPathName → UnitFullPath (cho frontend hiển thị và filter)
      UnitFullPath: row.FullPathName || '',
    }));

    if (search) {
      mappedData = mappedData.filter((row: any) => {
        return [row.FullName, row.CitizenID, row.SoldierID]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
    }

    if (unitId) {
      const unitResult = await pool.request()
        .input('unitId', sql.VarChar, unitId)
        .query(`
          SELECT HierarchyPath
          FROM OrganizationUnit
          WHERE UnitID = @unitId
        `);

      const selectedHierarchyPath = unitResult.recordset[0]?.HierarchyPath || '';
      mappedData = mappedData.filter((row: any) => {
        if (row.UnitID === unitId) return true;
        if (!selectedHierarchyPath) return false;
        return String(row.UnitHierarchyPath || '').startsWith(selectedHierarchyPath);
      });
    }

    if (unitPath) {
      const unitPathLower = unitPath.toLowerCase();
      const parts = unitPath.split(',').map((part) => part.trim()).filter(Boolean);
      const hierarchySearch = parts.length ? `/${parts.join('/').toLowerCase()}/` : '';

      mappedData = mappedData.filter((row: any) => {
        const hierarchyPath = String(row.UnitHierarchyPath || '').toLowerCase();
        const fullPath = String(row.UnitFullPath || '').toLowerCase();
        const shortName = String(row.UnitShortName || '').toLowerCase();

        return fullPath.includes(unitPathLower)
          || shortName.includes(unitPathLower)
          || hierarchyPath.includes(unitPathLower)
          || (!!hierarchySearch && hierarchyPath.includes(hierarchySearch));
      });
    }

    const total = mappedData.length;

    if (exportExcel) {
    return NextResponse.json({
        success: true,
        data: mappedData
    });
    }

    const start = (page - 1) * pageSize;
    const pagedData = mappedData.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      data: pagedData,
      count: pagedData.length,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Lỗi khi gọi SP:', error);
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
 * POST /api/soldiers
 * Thêm chiến sĩ mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const pool = await getPool();

    // Sinh SoldierID tự động (S + số thứ tự)
    const maxIdResult = await pool.request()
      .query(`
        SELECT MAX(CAST(SUBSTRING(SoldierID, 2, LEN(SoldierID) - 1) AS INT)) as MaxNum
        FROM Soldier
        WHERE SoldierID LIKE 'S%'
      `);

    const maxNum = maxIdResult.recordset[0]?.MaxNum || 0;
    const newSoldierID = `S${String(maxNum + 1).padStart(4, '0')}`;

    // Thêm chiến sĩ mới
    await pool.request()
      .input('SoldierID', sql.VarChar, newSoldierID)
      .input('FullName', sql.NVarChar, body.FullName)
      .input('DateOfBirth', sql.Date, body.DateOfBirth)
      .input('Gender', sql.TinyInt, body.Gender ?? 1)
      .input('CitizenID', sql.VarChar, body.CitizenID)
      .input('UnitID', sql.VarChar, body.UnitID)
      .input('Position', sql.NVarChar, body.Position)
      .input('RankID', sql.VarChar, body.RankID)
      .input('StatusID', sql.VarChar, body.StatusID || 'ST001')
      .input('Ethnicity', sql.NVarChar, body.Ethnicity || 'Kinh')
      .input('ReligionID', sql.VarChar, body.ReligionID || 'REL001')
      .input('MaritalStatusID', sql.VarChar, body.MaritalStatusID || 'MAR001')
      .input('EducationLevel', sql.NVarChar, body.EducationLevel)
      .input('Specialization', sql.NVarChar, body.Specialization)
      .input('PoliticalLevel', sql.NVarChar, body.PoliticalLevel)
      .input('Height', sql.Int, body.Height)
      .input('Weight', sql.Int, body.Weight)
      .input('BloodPressure', sql.NVarChar, body.BloodPressure)
      .input('BloodType', sql.NVarChar, body.BloodType)
      .input('HealthClassification', sql.NVarChar, body.HealthClassification)
      .input('Hometown', sql.NVarChar, body.Hometown)
      .input('Address', sql.NVarChar, body.Address)
      .input('EnlistmentDate', sql.Date, body.EnlistmentDate)
      .input('PartyJoinDate', sql.Date, body.PartyJoinDate)
      .input('YouthUnionJoinDate', sql.Date, body.YouthUnionJoinDate)
      .input('WardID', sql.VarChar, body.WardID)
      .input('ProvinceID', sql.VarChar, body.ProvinceID)
      .input('CreatedBy', sql.VarChar, body.CreatedBy)
      .query(`
        INSERT INTO Soldier (
          SoldierID, FullName, DateOfBirth, Gender, CitizenID,
          UnitID, Position, RankID, StatusID,
          Ethnicity, ReligionID, MaritalStatusID,
          EducationLevel, Specialization, PoliticalLevel,
          Height, Weight, BloodPressure, BloodType, HealthClassification,
          Hometown, Address, WardID, ProvinceID,
          EnlistmentDate, PartyJoinDate, YouthUnionJoinDate,
          CreatedDate, CreatedBy
        ) VALUES (
          @SoldierID, @FullName, @DateOfBirth, @Gender, @CitizenID,
          @UnitID, @Position, @RankID, @StatusID,
          @Ethnicity, @ReligionID, @MaritalStatusID,
          @EducationLevel, @Specialization, @PoliticalLevel,
          @Height, @Weight, @BloodPressure, @BloodType, @HealthClassification,
          @Hometown, @Address, @WardID, @ProvinceID,
          @EnlistmentDate, @PartyJoinDate, @YouthUnionJoinDate,
          GETDATE(), @CreatedBy
        )
      `);

    await createChangeHistory({
      pool,
      changedBy: body.CreatedBy,
      changeType: 'INSERT',
      changeReason: 'Thêm chiến sĩ',
      description: `Thêm mới chiến sĩ ${body.FullName || newSoldierID}`,
      totalSoldier: 1,
      details: [
        { soldierId: newSoldierID, fieldName: 'FullName', fieldDisplayName: 'Họ và tên', oldValue: null, newValue: body.FullName },
        { soldierId: newSoldierID, fieldName: 'CitizenID', fieldDisplayName: 'CCCD', oldValue: null, newValue: body.CitizenID },
        { soldierId: newSoldierID, fieldName: 'UnitID', fieldDisplayName: 'Đơn vị', oldValue: null, newValue: body.UnitID },
        { soldierId: newSoldierID, fieldName: 'RankID', fieldDisplayName: 'Cấp bậc', oldValue: null, newValue: body.RankID },
        { soldierId: newSoldierID, fieldName: 'StatusID', fieldDisplayName: 'Trạng thái', oldValue: null, newValue: body.StatusID || 'ST001' },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm chiến sĩ mới',
      data: { SoldierID: newSoldierID },
    });
  } catch (error) {
    console.error('Lỗi khi thêm chiến sĩ:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi thêm chiến sĩ' },
      { status: 500 }
    );
  }
}