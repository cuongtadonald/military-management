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
      // Khi chọn một đơn vị, phải lấy cả quân nhân thuộc toàn bộ
      // các đơn vị con bên dưới đơn vị đó.
      //
      // Ví dụ:
      //   F00001/
      //   F00001/E00001/
      //   F00001/E00001/D00001/
      //
      // Nếu chọn F00001 thì tất cả các path bắt đầu bằng
      // "F00001/" đều thuộc phạm vi được chọn.
      const unitResult = await pool.request()
        .input('unitId', sql.VarChar, unitId)
        .query(`
          SELECT
            UnitID,
            HierarchyPath
          FROM OrganizationUnit
          WHERE UnitID = @unitId
        `);

      const selectedHierarchyPath = String(
        unitResult.recordset[0]?.HierarchyPath || ''
      ).trim();

      if (selectedHierarchyPath) {
        // Chuẩn hóa để tránh trường hợp path trong DB không có
        // hoặc có dấu "/" cuối chuỗi.
        const normalizedSelectedPath =
          selectedHierarchyPath.endsWith('/')
            ? selectedHierarchyPath
            : `${selectedHierarchyPath}/`;

        mappedData = mappedData.filter((row: any) => {
          const rowUnitId = String(row.UnitID || '').trim();
          const rowHierarchyPath = String(
            row.UnitHierarchyPath || ''
          ).trim();

          // Quân nhân thuộc chính đơn vị được chọn.
          if (rowUnitId === unitId) return true;

          // Quân nhân thuộc bất kỳ đơn vị con nào.
          if (
            rowHierarchyPath &&
            (
              rowHierarchyPath === normalizedSelectedPath ||
              rowHierarchyPath.startsWith(normalizedSelectedPath)
            )
          ) {
            return true;
          }

          return false;
        });
      } else {
        // Nếu không tìm được HierarchyPath của đơn vị được chọn,
        // vẫn giữ hành vi an toàn: chỉ lấy đúng đơn vị đó.
        mappedData = mappedData.filter(
          (row: any) => String(row.UnitID || '').trim() === unitId
        );
      }
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
    
    // Validate các field bắt buộc
    if (!body.FullName || !body.CitizenID || !body.UnitID || !body.RankID) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc: Họ tên, CCCD, Đơn vị, Cấp bậc' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Sử dụng SoldierID từ form nếu có, ngược lại tự sinh
    let soldierID = body.SoldierID;
    if (!soldierID) {
      // Sinh SoldierID tự động (S + số thứ tự)
      const maxIdResult = await pool.request()
        .query(`
          SELECT MAX(CAST(SUBSTRING(SoldierID, 2, LEN(SoldierID) - 1) AS INT)) as MaxNum
          FROM Soldier
          WHERE SoldierID LIKE 'S%'
        `);

      const maxNum = maxIdResult.recordset[0]?.MaxNum || 0;
      soldierID = `S${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      // Kiểm tra SoldierID đã tồn tại chưa
      const checkResult = await pool.request()
        .input('soldierId', sql.VarChar, soldierID)
        .query('SELECT SoldierID FROM Soldier WHERE SoldierID = @soldierId');
      
      if (checkResult.recordset.length > 0) {
        return NextResponse.json(
          { success: false, message: `Mã quân nhân ${soldierID} đã tồn tại` },
          { status: 400 }
        );
      }
    }

    // Xử lý upload ảnh nếu có (base64)
    let photoPath = null;
    if (body.PhotoData) {
      try {
        const { writeFile, mkdir } = await import('fs/promises');
        const { existsSync } = await import('fs');
        const path = await import('path');
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'soldiers');
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        // Extract base64 data
        const matches = body.PhotoData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const fileName = `${soldierID}_${Date.now()}.${extension}`;
          const filePath = path.join(uploadDir, fileName);
          
          const buffer = Buffer.from(matches[2], 'base64');
          await writeFile(filePath, buffer);
          
          photoPath = `/uploads/soldiers/${fileName}`;
        }
      } catch (error) {
        console.error('Lỗi khi xử lý ảnh:', error);
      }
    }

    // Thêm chiến sĩ mới - sử dụng đúng tên cột
    await pool.request()
      .input('SoldierID', sql.VarChar, soldierID)
      .input('FullName', sql.NVarChar, body.FullName)
      .input('DateOfBirth', sql.Date, body.DateOfBirth || null)
      .input('Gender', sql.TinyInt, body.Gender ?? 1)
      .input('CitizenID', sql.VarChar, body.CitizenID)
      .input('UnitID', sql.VarChar, body.UnitID)
      .input('Position', sql.NVarChar, body.Position || '')
      .input('RankID', sql.VarChar, body.RankID)
      .input('StatusID', sql.VarChar, body.StatusID || 'ST001')
      .input('Ethnicity', sql.NVarChar, body.Ethnicity || 'Kinh')
      .input('Religion', sql.NVarChar, body.Religion || 'Không')
      .input('MaritalStatusID', sql.VarChar, body.MaritalStatusID || 'MAR001')
      .input('EducationLevel', sql.NVarChar, body.EducationLevel || null)
      .input('Specialization', sql.NVarChar, body.Specialization || null)
      .input('PoliticalLevel', sql.NVarChar, body.PoliticalLevel || null)
      .input('Height', sql.Int, body.Height || null)
      .input('Weight', sql.Int, body.Weight || null)
      .input('BloodPressure', sql.NVarChar, body.BloodPressure || null)
      .input('BloodType', sql.NVarChar, body.BloodType || null)
      .input('HealthClassification', sql.NVarChar, body.HealthClassification || null)
      .input('Hometown', sql.NVarChar, body.Hometown || null)
      .input('Address', sql.NVarChar, body.Address || null)
      .input('EnlistmentDate', sql.Date, body.EnlistmentDate || null)
      .input('PartyJoinDate', sql.Date, body.PartyJoinDate || null)
      .input('YouthUnionJoinDate', sql.Date, body.YouthUnionJoinDate || null)
      .input('WardID', sql.VarChar, body.WardID || null)
      .input('ProvinceID', sql.VarChar, body.ProvinceID || null)
      .input('PhotoPath', sql.NVarChar, photoPath)
      .input('SoldierType', sql.NVarChar, body.SoldierType || null)
      .input('CreatedBy', sql.VarChar, body.CreatedBy)
      .query(`
        INSERT INTO Soldier (
          SoldierID, FullName, DateOfBirth, Gender, CitizenID,
          UnitID, Position, RankID, StatusID,
          Ethnicity, Religion, MaritalStatusID,
          EducationLevel, Specialization, PoliticalLevel,
          Height, Weight, BloodPressure, BloodType, HealthClassification,
          Hometown, Address, WardID, ProvinceID,
          EnlistmentDate, PartyJoinDate, YouthUnionJoinDate,
          PhotoPath, SoldierType, CreatedDate, CreatedBy
        ) VALUES (
          @SoldierID, @FullName, @DateOfBirth, @Gender, @CitizenID,
          @UnitID, @Position, @RankID, @StatusID,
          @Ethnicity, @Religion, @MaritalStatusID,
          @EducationLevel, @Specialization, @PoliticalLevel,
          @Height, @Weight, @BloodPressure, @BloodType, @HealthClassification,
          @Hometown, @Address, @WardID, @ProvinceID,
          @EnlistmentDate, @PartyJoinDate, @YouthUnionJoinDate,
          @PhotoPath, @SoldierType, GETDATE(), @CreatedBy
        )
      `);

    // Lưu FamilyMembers nếu có
    if (body.FamilyMembers && Array.isArray(body.FamilyMembers)) {
      for (let i = 0; i < body.FamilyMembers.length; i++) {
        const member = body.FamilyMembers[i];
        if (member.FullName && member.Relationship) {
          const familyID = `FM${soldierID}${String(i + 1).padStart(3, '0')}`;
          await pool.request()
            .input('FamilyID', sql.VarChar, familyID)
            .input('SoldierID', sql.VarChar, soldierID)
            .input('FullName', sql.NVarChar, member.FullName)
            .input('Relationship', sql.NVarChar, member.Relationship)
            .input('DateOfBirth', sql.Date, member.DateOfBirth || null)
            .input('Occupation', sql.NVarChar, member.Occupation || null)
            .input('Workplace', sql.NVarChar, member.Workplace || null)
            .input('PhoneNumber', sql.VarChar, member.PhoneNumber || null)
            .input('Address', sql.NVarChar, member.Address || null)
            .input('IsDependent', sql.Bit, member.IsDependent ? 1 : 0)
            .query(`
              INSERT INTO SoldierFamily (
                FamilyID, SoldierID, FullName, Relationship, DateOfBirth,
                Occupation, Workplace, PhoneNumber, Address, IsDependent
              ) VALUES (
                @FamilyID, @SoldierID, @FullName, @Relationship, @DateOfBirth,
                @Occupation, @Workplace, @PhoneNumber, @Address, @IsDependent
              )
            `);
        }
      }
    }

    // Lưu TrainingProcesses nếu có
    if (body.TrainingProcesses && Array.isArray(body.TrainingProcesses)) {
      for (let i = 0; i < body.TrainingProcesses.length; i++) {
        const training = body.TrainingProcesses[i];
        if (training.SchoolName) {
          const trainingID = `TP${soldierID}${String(i + 1).padStart(3, '0')}`;
          await pool.request()
            .input('TrainingID', sql.VarChar, trainingID)
            .input('SoldierID', sql.VarChar, soldierID)
            .input('SchoolName', sql.NVarChar, training.SchoolName)
            .input('MajorName', sql.NVarChar, training.MajorName || null)
            .input('FromDate', sql.NVarChar, training.FromDate || null)
            .input('ToDate', sql.NVarChar, training.ToDate || null)
            .input('TrainingType', sql.NVarChar, training.TrainingType || null)
            .input('Certificate', sql.NVarChar, training.Certificate || null)
            .input('Description', sql.NVarChar, training.Description || null)
            .query(`
              INSERT INTO SoldierTrainingProcess (
                TrainingID, SoldierID, SchoolName, MajorName, FromDate, ToDate,
                TrainingType, Certificate, Description
              ) VALUES (
                @TrainingID, @SoldierID, @SchoolName, @MajorName, @FromDate, @ToDate,
                @TrainingType, @Certificate, @Description
              )
            `);
        }
      }
    }

    // Lưu WorkProcesses nếu có
    if (body.WorkProcesses && Array.isArray(body.WorkProcesses)) {
      for (let i = 0; i < body.WorkProcesses.length; i++) {
        const work = body.WorkProcesses[i];
        if (work.WorkDescription || work.FromDate || work.ToDate) {
          const workProcessID = `WP${soldierID}${String(i + 1).padStart(3, '0')}`;
          await pool.request()
            .input('WorkProcessID', sql.VarChar, workProcessID)
            .input('SoldierID', sql.VarChar, soldierID)
            .input('FromDate', sql.NVarChar, work.FromDate || null)
            .input('ToDate', sql.NVarChar, work.ToDate || null)
            .input('WorkDescription', sql.NVarChar, work.WorkDescription || null)
            .input('RankID', sql.VarChar, work.RankID || null)
            .input('PartyPosition', sql.NVarChar, work.PartyPosition || null)
            .input('Description', sql.NVarChar, work.Description || null)
            .query(`
              INSERT INTO SoldierWorkProcess (
                WorkProcessID, SoldierID, FromDate, ToDate, WorkDescription, RankID, PartyPosition, Description
              ) VALUES (
                @WorkProcessID, @SoldierID, @FromDate, @ToDate, @WorkDescription, @RankID, @PartyPosition, @Description
              )
            `);
        }
      }
    }

    await createChangeHistory({
      pool,
      changedBy: body.CreatedBy,
      changeType: 'INSERT',
      changeReason: 'Thêm chiến sĩ',
      description: `Thêm mới chiến sĩ ${body.FullName || soldierID}`,
      totalSoldier: 1,
      details: [
        { soldierId: soldierID, fieldName: 'FullName', fieldDisplayName: 'Họ và tên', oldValue: null, newValue: body.FullName },
        { soldierId: soldierID, fieldName: 'CitizenID', fieldDisplayName: 'CCCD', oldValue: null, newValue: body.CitizenID },
        { soldierId: soldierID, fieldName: 'UnitID', fieldDisplayName: 'Đơn vị', oldValue: null, newValue: body.UnitID },
        { soldierId: soldierID, fieldName: 'RankID', fieldDisplayName: 'Cấp bậc', oldValue: null, newValue: body.RankID },
        { soldierId: soldierID, fieldName: 'StatusID', fieldDisplayName: 'Trạng thái', oldValue: null, newValue: body.StatusID || 'ST001' },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm chiến sĩ mới',
      data: { SoldierID: soldierID },
    });
  } catch (error: any) {
    console.error('Lỗi khi thêm chiến sĩ:', error);
    return NextResponse.json(
      { success: false, message: `Lỗi khi thêm chiến sĩ: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}