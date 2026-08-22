/**
 * File: app/api/soldiers/import/route.ts
 * Mô tả: API import quân nhân từ Excel - ĐÃ CẬP NHẬT THEO SCHEMA DATABASE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { createChangeHistory } from '@/lib/audit';

interface SoldierImportData {
  SoldierID: string;
  FullName: string;
  UnitID: string;
  Position: string;
  RankID: string;
  DateOfBirth: string;
  Gender: number;
  CitizenID: string;
  Hometown?: string;
  Address?: string;
  ProvinceID?: string;
  WardID?: string;
  Ethnicity?: string;
  SoldierType?: string;
  Religion?: string;
  MaritalStatusID?: string;
  EducationLevel?: string;
  Specialization?: string;
  PoliticalLevel?: string;
  BloodType?: string;
  HealthClassification?: string;
  Height?: number;
  Weight?: number;
  BloodPressure?: string;
  EnlistmentDate?: string;
  PartyJoinDate?: string;
  YouthUnionJoinDate?: string;
  PhotoPath?: string;
  FamilyMembers?: FamilyMemberData[];
  WorkProcesses?: WorkProcessData[];
  TrainingProcesses?: TrainingProcessData[];
}

interface FamilyMemberData {
  FullName: string;
  Relationship: string;
  DateOfBirth?: string;
  Occupation?: string;
  Workplace?: string;
  PhoneNumber?: string;
  Address?: string;
  IsDependent?: boolean;
}

interface WorkProcessData {
  FromDate?: string;
  ToDate?: string;
  WorkDescription?: string;
  RankID?: string;
  PartyPosition?: string;
}

interface TrainingProcessData {
  SchoolName: string;
  MajorName?: string;
  FromDate?: string;
  ToDate?: string;
  TrainingType?: string;
  Certificate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soldiers, updateSoldiers, userId } = body as {
      soldiers: SoldierImportData[];
      updateSoldiers?: SoldierImportData[];
      userId: string;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    const hasNewSoldiers = soldiers && Array.isArray(soldiers) && soldiers.length > 0;
    const hasUpdateSoldiers = updateSoldiers && Array.isArray(updateSoldiers) && updateSoldiers.length > 0;

    if (!hasNewSoldiers && !hasUpdateSoldiers) {
      return NextResponse.json(
        { success: false, message: 'Không có dữ liệu để import' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Lấy thông tin user để validate quyền
    const userResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT u.UnitID, u.RoleID, ou.HierarchyPath
        FROM [User] u
        INNER JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.UserID = @userId
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy user' },
        { status: 404 }
      );
    }

    const userUnitId = userResult.recordset[0].UnitID;
    const userRoleId = userResult.recordset[0].RoleID;
    const userHierarchyPath = userResult.recordset[0].HierarchyPath;

    const results: { success: boolean; soldierId?: string; error?: string; rowNumber?: number }[] = [];
    const updateResults: { success: boolean; soldierId?: string; error?: string; rowNumber?: number }[] = [];
    const changeHistoryDetails: any[] = [];

    // ============================================================
    // XỬ LÝ THÊM MỚI
    // ============================================================
    if (hasNewSoldiers) {
      for (let i = 0; i < soldiers.length; i++) {
        const soldier = soldiers[i];
        const rowNumber = i + 1;

        try {
          // Validate các field bắt buộc
          if (!soldier.SoldierID || !soldier.FullName || !soldier.CitizenID || !soldier.UnitID || !soldier.RankID) {
            results.push({
              success: false,
              rowNumber,
              error: 'Thiếu thông tin bắt buộc (Mã quân nhân, Họ tên, CCCD, Mã đơn vị, Mã cấp bậc)'
            });
            continue;
          }

          // Validate UnitID có tồn tại
          const unitCheck = await pool.request()
            .input('unitId', sql.VarChar, soldier.UnitID)
            .query('SELECT UnitID, HierarchyPath FROM OrganizationUnit WHERE UnitID = @unitId');
          
          if (unitCheck.recordset.length === 0) {
            results.push({
              success: false,
              rowNumber,
              error: `Mã đơn vị không tồn tại: ${soldier.UnitID}`
            });
            continue;
          }

          const unitHierarchyPath = unitCheck.recordset[0].HierarchyPath;

          // Validate quyền
          const isAdmin = userRoleId === 'R001' || userRoleId === 'ADMIN';
          if (!isAdmin) {
            const isSubordinate = unitHierarchyPath.startsWith(userHierarchyPath);
            if (!isSubordinate) {
              results.push({
                success: false,
                rowNumber,
                error: `Đơn vị "${soldier.UnitID}" không thuộc quyền quản lý của bạn`
              });
              continue;
            }
          }

          // Validate RankID
          const rankCheck = await pool.request()
            .input('rankId', sql.VarChar, soldier.RankID)
            .query('SELECT RankID FROM Rank WHERE RankID = @rankId');
          
          if (rankCheck.recordset.length === 0) {
            results.push({
              success: false,
              rowNumber,
              error: `Mã cấp bậc không tồn tại: ${soldier.RankID}`
            });
            continue;
          }

          // Kiểm tra SoldierID đã tồn tại
          const soldierCheck = await pool.request()
            .input('soldierId', sql.VarChar, soldier.SoldierID)
            .query('SELECT SoldierID FROM Soldier WHERE SoldierID = @soldierId');
          
          if (soldierCheck.recordset.length > 0) {
            results.push({
              success: false,
              rowNumber,
              error: `Mã quân nhân đã tồn tại: ${soldier.SoldierID}`
            });
            continue;
          }

          // INSERT vào bảng Soldier - THEO ĐÚNG SCHEMA
          await pool.request()
            .input('SoldierID', sql.VarChar, soldier.SoldierID)
            .input('FullName', sql.NVarChar, soldier.FullName)
            .input('DateOfBirth', sql.DateTime, soldier.DateOfBirth || null)
            .input('Gender', sql.TinyInt, soldier.Gender ?? 1)
            .input('CitizenID', sql.VarChar, soldier.CitizenID)
            .input('UnitID', sql.VarChar, soldier.UnitID)
            .input('Position', sql.NVarChar, soldier.Position || '')
            .input('RankID', sql.VarChar, soldier.RankID)
            .input('StatusID', sql.VarChar, 'ST001') // Mặc định: Đang tại ngũ
            .input('Ethnicity', sql.NVarChar, soldier.Ethnicity || 'Kinh')
            .input('Religion', sql.NVarChar, soldier.Religion || 'Không')
            .input('MaritalStatusID', sql.VarChar, soldier.MaritalStatusID || null)
            .input('EducationLevel', sql.NVarChar, soldier.EducationLevel || null)
            .input('Specialization', sql.NVarChar, soldier.Specialization || null)
            .input('PoliticalLevel', sql.NVarChar, soldier.PoliticalLevel || null)
            .input('BloodType', sql.NVarChar, soldier.BloodType || null)
            .input('HealthClassification', sql.NVarChar, soldier.HealthClassification || null)
            .input('Height', sql.Decimal, soldier.Height || null)
            .input('Weight', sql.Decimal, soldier.Weight || null)
            .input('BloodPressure', sql.NVarChar, soldier.BloodPressure || null)
            .input('Hometown', sql.NVarChar, soldier.Hometown || null)
            .input('Address', sql.NVarChar, soldier.Address || null)
            .input('WardID', sql.VarChar, soldier.WardID || null)
            .input('ProvinceID', sql.VarChar, soldier.ProvinceID || null)
            .input('EnlistmentDate', sql.DateTime, soldier.EnlistmentDate || null)
            .input('PartyJoinDate', sql.DateTime, soldier.PartyJoinDate || null)
            .input('YouthUnionJoinDate', sql.DateTime, soldier.YouthUnionJoinDate || null)
            .input('PhotoPath', sql.NVarChar, soldier.PhotoPath || null)
            .input('SoldierType', sql.NVarChar, soldier.SoldierType || null)
            .input('CreatedBy', sql.VarChar, userId)
            .query(`
              INSERT INTO Soldier (
                SoldierID, FullName, DateOfBirth, Gender, CitizenID,
                UnitID, Position, RankID, StatusID,
                Ethnicity, Religion, MaritalStatusID,
                EducationLevel, Specialization, PoliticalLevel,
                BloodType, HealthClassification, Height, Weight, BloodPressure,
                Hometown, Address, WardID, ProvinceID,
                EnlistmentDate, PartyJoinDate, YouthUnionJoinDate,
                PhotoPath, SoldierType, CreatedDate, CreatedBy
              ) VALUES (
                @SoldierID, @FullName, @DateOfBirth, @Gender, @CitizenID,
                @UnitID, @Position, @RankID, @StatusID,
                @Ethnicity, @Religion, @MaritalStatusID,
                @EducationLevel, @Specialization, @PoliticalLevel,
                @BloodType, @HealthClassification, @Height, @Weight, @BloodPressure,
                @Hometown, @Address, @WardID, @ProvinceID,
                @EnlistmentDate, @PartyJoinDate, @YouthUnionJoinDate,
                @PhotoPath, @SoldierType, GETDATE(), @CreatedBy
              )
            `);

          // INSERT vào bảng SoldierFamily
          if (soldier.FamilyMembers && soldier.FamilyMembers.length > 0) {
            for (let j = 0; j < soldier.FamilyMembers.length; j++) {
              const member = soldier.FamilyMembers[j];
              if (member.FullName && member.Relationship) {
                const familyId = `FM${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('FamilyID', sql.VarChar, familyId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('FullName', sql.NVarChar, member.FullName)
                  .input('Relationship', sql.NVarChar, member.Relationship)
                  .input('DateOfBirth', sql.DateTime, member.DateOfBirth || null)
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

          // INSERT vào bảng SoldierWorkProcess
          if (soldier.WorkProcesses && soldier.WorkProcesses.length > 0) {
            for (let j = 0; j < soldier.WorkProcesses.length; j++) {
              const work = soldier.WorkProcesses[j];
              if (work.WorkDescription || work.FromDate || work.ToDate) {
                const workId = `WP${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('WorkProcessID', sql.VarChar, workId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('FromDate', sql.NVarChar, work.FromDate || null)
                  .input('ToDate', sql.NVarChar, work.ToDate || null)
                  .input('WorkDescription', sql.NVarChar, work.WorkDescription || null)
                  .input('RankID', sql.VarChar, work.RankID || null)
                  .input('PartyPosition', sql.NVarChar, work.PartyPosition || null)
                  .query(`
                    INSERT INTO SoldierWorkProcess (
                      WorkProcessID, SoldierID, FromDate, ToDate, WorkDescription, RankID, PartyPosition
                    ) VALUES (
                      @WorkProcessID, @SoldierID, @FromDate, @ToDate, @WorkDescription, @RankID, @PartyPosition
                    )
                  `);
              }
            }
          }

          // INSERT vào bảng SoldierTrainingProcess
          if (soldier.TrainingProcesses && soldier.TrainingProcesses.length > 0) {
            for (let j = 0; j < soldier.TrainingProcesses.length; j++) {
              const training = soldier.TrainingProcesses[j];
              if (training.SchoolName) {
                const trainingId = `TP${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('TrainingID', sql.VarChar, trainingId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('SchoolName', sql.NVarChar, training.SchoolName)
                  .input('MajorName', sql.NVarChar, training.MajorName || null)
                  .input('FromDate', sql.NVarChar, training.FromDate || null)
                  .input('ToDate', sql.NVarChar, training.ToDate || null)
                  .input('TrainingType', sql.NVarChar, training.TrainingType || null)
                  .input('Certificate', sql.NVarChar, training.Certificate || null)
                  .query(`
                    INSERT INTO SoldierTrainingProcess (
                      TrainingID, SoldierID, SchoolName, MajorName, FromDate, ToDate,
                      TrainingType, Certificate
                    ) VALUES (
                      @TrainingID, @SoldierID, @SchoolName, @MajorName, @FromDate, @ToDate,
                      @TrainingType, @Certificate
                    )
                  `);
              }
            }
          }

          // Lưu change history
          changeHistoryDetails.push(
            { soldierId: soldier.SoldierID, fieldName: 'FullName', fieldDisplayName: 'Họ và tên', oldValue: null, newValue: soldier.FullName },
            { soldierId: soldier.SoldierID, fieldName: 'CitizenID', fieldDisplayName: 'CCCD', oldValue: null, newValue: soldier.CitizenID },
            { soldierId: soldier.SoldierID, fieldName: 'UnitID', fieldDisplayName: 'Đơn vị', oldValue: null, newValue: soldier.UnitID },
          );

          results.push({ success: true, soldierId: soldier.SoldierID, rowNumber });

        } catch (error: any) {
          console.error(`Lỗi khi thêm mới dòng ${rowNumber}:`, error);
          results.push({
            success: false,
            rowNumber,
            error: error.message || 'Lỗi không xác định'
          });
        }
      }
    }

    // ============================================================
    // XỬ LÝ CẬP NHẬT
    // ============================================================
    if (hasUpdateSoldiers) {
      for (let i = 0; i < updateSoldiers.length; i++) {
        const soldier = updateSoldiers[i];
        const rowNumber = i + 1;

        try {
          // Chỉ cần có SoldierID để xác định bản ghi cập nhật
          if (!soldier.SoldierID) {
            updateResults.push({
              success: false,
              rowNumber,
              error: 'Thiếu mã quân nhân để cập nhật'
            });
            continue;
          }

          // Kiểm tra SoldierID có tồn tại
          const soldierCheck = await pool.request()
            .input('soldierId', sql.VarChar, soldier.SoldierID)
            .query('SELECT SoldierID FROM Soldier WHERE SoldierID = @soldierId');

          if (soldierCheck.recordset.length === 0) {
            updateResults.push({
              success: false,
              rowNumber,
              error: `Mã quân nhân không tồn tại: ${soldier.SoldierID}`
            });
            continue;
          }

          // Validate UnitID nếu có cung cấp
          if (soldier.UnitID) {
            const unitCheck = await pool.request()
              .input('unitId', sql.VarChar, soldier.UnitID)
              .query('SELECT UnitID, HierarchyPath FROM OrganizationUnit WHERE UnitID = @unitId');

            if (unitCheck.recordset.length === 0) {
              updateResults.push({
                success: false,
                rowNumber,
                error: `Mã đơn vị không tồn tại: ${soldier.UnitID}`
              });
              continue;
            }

            const unitHierarchyPath = unitCheck.recordset[0].HierarchyPath;

            // Validate quyền
            const isAdmin = userRoleId === 'R001' || userRoleId === 'ADMIN';
            if (!isAdmin) {
              const isSubordinate = unitHierarchyPath.startsWith(userHierarchyPath);
              if (!isSubordinate) {
                updateResults.push({
                  success: false,
                  rowNumber,
                  error: `Đơn vị "${soldier.UnitID}" không thuộc quyền quản lý của bạn`
                });
                continue;
              }
            }
          }

          // Validate RankID nếu có cung cấp
          if (soldier.RankID) {
            const rankCheck = await pool.request()
              .input('rankId', sql.VarChar, soldier.RankID)
              .query('SELECT RankID FROM Rank WHERE RankID = @rankId');

            if (rankCheck.recordset.length === 0) {
              updateResults.push({
                success: false,
                rowNumber,
                error: `Mã cấp bậc không tồn tại: ${soldier.RankID}`
              });
              continue;
            }
          }

          // Xây dựng câu UPDATE động - chỉ cập nhật các field có giá trị
          const setClauses: string[] = [];
          const updateRequest = pool.request();
          updateRequest.input('SoldierID', sql.VarChar, soldier.SoldierID);

          const fieldMap: { key: keyof SoldierImportData; column: string; type: any }[] = [
            { key: 'FullName', column: 'FullName', type: sql.NVarChar },
            { key: 'DateOfBirth', column: 'DateOfBirth', type: sql.DateTime },
            { key: 'Gender', column: 'Gender', type: sql.TinyInt },
            { key: 'CitizenID', column: 'CitizenID', type: sql.VarChar },
            { key: 'UnitID', column: 'UnitID', type: sql.VarChar },
            { key: 'Position', column: 'Position', type: sql.NVarChar },
            { key: 'RankID', column: 'RankID', type: sql.VarChar },
            { key: 'Ethnicity', column: 'Ethnicity', type: sql.NVarChar },
            { key: 'Religion', column: 'Religion', type: sql.NVarChar },
            { key: 'MaritalStatusID', column: 'MaritalStatusID', type: sql.VarChar },
            { key: 'EducationLevel', column: 'EducationLevel', type: sql.NVarChar },
            { key: 'Specialization', column: 'Specialization', type: sql.NVarChar },
            { key: 'PoliticalLevel', column: 'PoliticalLevel', type: sql.NVarChar },
            { key: 'BloodType', column: 'BloodType', type: sql.NVarChar },
            { key: 'HealthClassification', column: 'HealthClassification', type: sql.NVarChar },
            { key: 'Height', column: 'Height', type: sql.Decimal },
            { key: 'Weight', column: 'Weight', type: sql.Decimal },
            { key: 'BloodPressure', column: 'BloodPressure', type: sql.NVarChar },
            { key: 'Hometown', column: 'Hometown', type: sql.NVarChar },
            { key: 'Address', column: 'Address', type: sql.NVarChar },
            { key: 'WardID', column: 'WardID', type: sql.VarChar },
            { key: 'ProvinceID', column: 'ProvinceID', type: sql.VarChar },
            { key: 'EnlistmentDate', column: 'EnlistmentDate', type: sql.DateTime },
            { key: 'PartyJoinDate', column: 'PartyJoinDate', type: sql.DateTime },
            { key: 'YouthUnionJoinDate', column: 'YouthUnionJoinDate', type: sql.DateTime },
            { key: 'PhotoPath', column: 'PhotoPath', type: sql.NVarChar },
            { key: 'SoldierType', column: 'SoldierType', type: sql.NVarChar },
          ];

          for (const field of fieldMap) {
            const value = soldier[field.key];
            // Chỉ cập nhật nếu giá trị khác rỗng (với string) hoặc khác null/undefined
            if (value !== undefined && value !== null && value !== '') {
              updateRequest.input(field.key as string, field.type, value);
              setClauses.push(`${field.column} = @${field.key}`);
            }
          }

          if (setClauses.length > 0) {
            updateRequest.input('LastModifiedBy', sql.VarChar, userId);
            const updateQuery = `
              UPDATE Soldier
              SET ${setClauses.join(', ')}, LastModifiedDate = GETDATE(), LastModifiedBy = @LastModifiedBy
              WHERE SoldierID = @SoldierID
            `;
            await updateRequest.query(updateQuery);
          }

          // Cập nhật thân nhân (xóa cũ, thêm mới)
          if (soldier.FamilyMembers && soldier.FamilyMembers.length > 0) {
            // Xóa thân nhân cũ
            await pool.request()
              .input('SoldierID', sql.VarChar, soldier.SoldierID)
              .query('DELETE FROM SoldierFamily WHERE SoldierID = @SoldierID');

            // Thêm thân nhân mới
            for (let j = 0; j < soldier.FamilyMembers.length; j++) {
              const member = soldier.FamilyMembers[j];
              if (member.FullName && member.Relationship) {
                const familyId = `FM${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('FamilyID', sql.VarChar, familyId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('FullName', sql.NVarChar, member.FullName)
                  .input('Relationship', sql.NVarChar, member.Relationship)
                  .input('DateOfBirth', sql.DateTime, member.DateOfBirth || null)
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

          // Cập nhật quá trình công tác (xóa cũ, thêm mới)
          if (soldier.WorkProcesses && soldier.WorkProcesses.length > 0) {
            await pool.request()
              .input('SoldierID', sql.VarChar, soldier.SoldierID)
              .query('DELETE FROM SoldierWorkProcess WHERE SoldierID = @SoldierID');

            for (let j = 0; j < soldier.WorkProcesses.length; j++) {
              const work = soldier.WorkProcesses[j];
              if (work.WorkDescription || work.FromDate || work.ToDate) {
                const workId = `WP${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('WorkProcessID', sql.VarChar, workId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('FromDate', sql.NVarChar, work.FromDate || null)
                  .input('ToDate', sql.NVarChar, work.ToDate || null)
                  .input('WorkDescription', sql.NVarChar, work.WorkDescription || null)
                  .input('RankID', sql.VarChar, work.RankID || null)
                  .input('PartyPosition', sql.NVarChar, work.PartyPosition || null)
                  .query(`
                    INSERT INTO SoldierWorkProcess (
                      WorkProcessID, SoldierID, FromDate, ToDate, WorkDescription, RankID, PartyPosition
                    ) VALUES (
                      @WorkProcessID, @SoldierID, @FromDate, @ToDate, @WorkDescription, @RankID, @PartyPosition
                    )
                  `);
              }
            }
          }

          // Cập nhật quá trình đào tạo (xóa cũ, thêm mới)
          if (soldier.TrainingProcesses && soldier.TrainingProcesses.length > 0) {
            await pool.request()
              .input('SoldierID', sql.VarChar, soldier.SoldierID)
              .query('DELETE FROM SoldierTrainingProcess WHERE SoldierID = @SoldierID');

            for (let j = 0; j < soldier.TrainingProcesses.length; j++) {
              const training = soldier.TrainingProcesses[j];
              if (training.SchoolName) {
                const trainingId = `TP${soldier.SoldierID}${j + 1}`;
                await pool.request()
                  .input('TrainingID', sql.VarChar, trainingId)
                  .input('SoldierID', sql.VarChar, soldier.SoldierID)
                  .input('SchoolName', sql.NVarChar, training.SchoolName)
                  .input('MajorName', sql.NVarChar, training.MajorName || null)
                  .input('FromDate', sql.NVarChar, training.FromDate || null)
                  .input('ToDate', sql.NVarChar, training.ToDate || null)
                  .input('TrainingType', sql.NVarChar, training.TrainingType || null)
                  .input('Certificate', sql.NVarChar, training.Certificate || null)
                  .query(`
                    INSERT INTO SoldierTrainingProcess (
                      TrainingID, SoldierID, SchoolName, MajorName, FromDate, ToDate,
                      TrainingType, Certificate
                    ) VALUES (
                      @TrainingID, @SoldierID, @SchoolName, @MajorName, @FromDate, @ToDate,
                      @TrainingType, @Certificate
                    )
                  `);
              }
            }
          }

          // Lưu change history cho cập nhật
          changeHistoryDetails.push(
            { soldierId: soldier.SoldierID, fieldName: 'Import', fieldDisplayName: 'Cập nhật từ Excel', oldValue: null, newValue: 'Update' },
          );

          updateResults.push({ success: true, soldierId: soldier.SoldierID, rowNumber });

        } catch (error: any) {
          console.error(`Lỗi khi cập nhật dòng ${rowNumber}:`, error);
          updateResults.push({
            success: false,
            rowNumber,
            error: error.message || 'Lỗi không xác định'
          });
        }
      }
    }

    // Tạo change history
    if (changeHistoryDetails.length > 0) {
      const totalSuccess = results.filter(r => r.success).length + updateResults.filter(r => r.success).length;
      await createChangeHistory({
        pool,
        changedBy: userId,
        changeType: results.length > 0 && updateResults.length > 0 ? 'BOTH' : updateResults.length > 0 ? 'UPDATE' : 'INSERT',
        changeReason: 'Import từ Excel',
        description: `Import ${totalSuccess} quân nhân từ Excel`,
        totalSoldier: totalSuccess,
        details: changeHistoryDetails,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const updateSuccessCount = updateResults.filter(r => r.success).length;
    const updateFailCount = updateResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${successCount + updateSuccessCount} quân nhân${(failCount + updateFailCount) > 0 ? `, ${(failCount + updateFailCount)} thất bại` : ''}`,
      data: {
        total: (soldiers?.length || 0) + (updateSoldiers?.length || 0),
        success: successCount,
        failed: failCount,
        updateSuccess: updateSuccessCount,
        updateFailed: updateFailCount,
        results: results.map(r => ({
          rowNumber: r.rowNumber,
          success: r.success,
          soldierId: r.soldierId,
          error: r.error
        })),
        updateResults: updateResults.map(r => ({
          rowNumber: r.rowNumber,
          success: r.success,
          soldierId: r.soldierId,
          error: r.error
        }))
      }
    });

  } catch (error) {
    console.error('Lỗi khi import:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi import dữ liệu' },
      { status: 500 }
    );
  }
}
