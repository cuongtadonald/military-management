/**
 * File: app/api/units/route.ts
 * Mô tả: API lấy cây đơn vị và thêm đơn vị mới
 * Cập nhật: 2026-07-03
 * Thay đổi:
 *   - Thêm UnitShortName vào kết quả trả về để hỗ trợ search
 *   - Thêm UnitName, UnitShortName, HierarchyPath, FullPathName
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * GET /api/units
 * Lấy cây đơn vị của user theo HierarchyPath
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

    // Lấy thông tin user để xác định đơn vị gốc
    const userResult = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT u.UnitID, ou.HierarchyPath 
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
    const userHierarchyPath = userResult.recordset[0].HierarchyPath;

    // Lấy tất cả đơn vị con - THÊM UnitShortName
    const unitsResult = await pool.request()
      .input('hierarchyPath', sql.VarChar, userHierarchyPath + '%')
      .query(`
        SELECT 
          UnitID,
          UnitName,
          UnitShortName,
          UnitLevel,
          ParentUnitID,
          HierarchyPath,
          FullPathName
        FROM OrganizationUnit
        WHERE HierarchyPath LIKE @hierarchyPath
        ORDER BY UnitID ASC
      `);


    return NextResponse.json({
      success: true,
      data: unitsResult.recordset,
      rootUnitId: userUnitId,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy cây đơn vị:', error);
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
 * POST /api/units
 * Thêm đơn vị mới vào cây
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitName, parentUnitId, userId } = body;

    if (!unitName || !parentUnitId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Lấy thông tin đơn vị cha
    const parentResult = await pool.request()
      .input('parentUnitId', sql.VarChar, parentUnitId)
      .query(`
        SELECT UnitLevel, HierarchyPath 
        FROM OrganizationUnit 
        WHERE UnitID = @parentUnitId
      `);

    if (parentResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đơn vị cha' },
        { status: 404 }
      );
    }

    const parentLevel = parentResult.recordset[0].UnitLevel;
    const parentPath = parentResult.recordset[0].HierarchyPath;
    const newLevel = parentLevel + 1;

    // Xác định prefix theo level
    const levelPrefix: Record<number, string> = {
      1: 'F', // Sư đoàn
      2: 'E', // Trung đoàn
      3: 'D', // Tiểu đoàn
      4: 'C', // Đại đội
      5: 'B', // Trung đội
      6: 'A', // Tiểu đội
    };

    const prefix = levelPrefix[newLevel] || 'U';

    // Tìm số lớn nhất hiện tại có cùng prefix
    const maxIdResult = await pool.request()
      .input('prefix', sql.VarChar, prefix + '%')
      .query(`
        SELECT MAX(CAST(SUBSTRING(UnitID, 2, LEN(UnitID) - 1) AS INT)) as MaxNum
        FROM OrganizationUnit
        WHERE UnitID LIKE @prefix
      `);

    const maxNum = maxIdResult.recordset[0].MaxNum || 0;
    const newNum = maxNum + 1;
    const newUnitId = `${prefix}${String(newNum).padStart(5, '0')}`;
    const newHierarchyPath = parentPath + newUnitId + '/';

    // Tính FullPathName
    const pathIds = parentPath.split('/').filter((id: string) => id.length > 0);
    
    let fullPathName = unitName;
    if (pathIds.length > 0) {
      const parentNamesResult = await pool.request()
        .input('unitIds', sql.NVarChar, pathIds.join(','))
        .query(`
          SELECT UnitID, UnitName 
          FROM OrganizationUnit 
          WHERE UnitID IN (SELECT value FROM STRING_SPLIT(@unitIds, ','))
          ORDER BY UnitLevel
        `);
      
      const parentNames = parentNamesResult.recordset.map(r => r.UnitName);
      fullPathName = [...parentNames, unitName].join(',');
    }

    // Tạo ShortName cho đơn vị mới (viết tắt từ tên)
    const shortName = unitName
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 10);

    // Thêm đơn vị mới
    await pool.request()
      .input('unitId', sql.VarChar, newUnitId)
      .input('unitName', sql.NVarChar, unitName)
      .input('unitShortName', sql.VarChar, shortName)
      .input('unitLevel', sql.Int, newLevel)
      .input('parentUnitId', sql.VarChar, parentUnitId)
      .input('hierarchyPath', sql.VarChar, newHierarchyPath)
      .input('fullPathName', sql.NVarChar, fullPathName)
      .query(`
        INSERT INTO OrganizationUnit (UnitID, UnitName, UnitShortName, UnitLevel, ParentUnitID, HierarchyPath, FullPathName)
        VALUES (@unitId, @unitName, @unitShortName, @unitLevel, @parentUnitId, @hierarchyPath, @fullPathName)
      `);


    return NextResponse.json({
      success: true,
      message: 'Thêm đơn vị thành công',
      data: {
        UnitID: newUnitId,
        UnitName: unitName,
        UnitShortName: shortName,
        UnitLevel: newLevel,
        ParentUnitID: parentUnitId,
        HierarchyPath: newHierarchyPath,
        FullPathName: fullPathName,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi khi thêm đơn vị:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi khi thêm đơn vị',
      },
      { status: 500 }
    );
  }
}