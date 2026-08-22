/**
 * File: app/api/units/resolve-names/route.ts
 * Mô tả: API lấy tên đơn vị từ danh sách UnitID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitIds } = body as { unitIds: string[] };

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { unitNames: {} }
      });
    }

    const pool = await getPool();

    // Tạo map để lưu kết quả
    const unitNames: Record<string, string> = {};
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < unitIds.length; i += CHUNK_SIZE) {
      const chunk = unitIds.slice(i, i + CHUNK_SIZE);

      const request = pool.request();
      const placeholders: string[] = [];

      chunk.forEach((id, idx) => {
        request.input(`id${idx}`, sql.VarChar, id);
        placeholders.push(`@id${idx}`);
      });

      const result = await request.query(
        `SELECT UnitID, UnitName FROM OrganizationUnit WHERE UnitID IN (${placeholders.join(', ')})`
      );

      result.recordset.forEach((row: any) => {
        unitNames[row.UnitID] = row.UnitName;
      });
    }

    return NextResponse.json({
      success: true,
      data: { unitNames }
    });

  } catch (error) {
    console.error('Lỗi khi lấy tên đơn vị:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy tên đơn vị' },
      { status: 500 }
    );
  }
}
