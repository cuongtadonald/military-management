/**
 * File: app/api/soldiers/check-existing/route.ts
 * Mô tả: API kiểm tra các Mã QN đã tồn tại trong hệ thống
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soldierIds } = body as { soldierIds: string[] };

    if (!soldierIds || !Array.isArray(soldierIds) || soldierIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { existingIds: [] }
      });
    }

    const pool = await getPool();

    // Tạo bảng tạm để truyền danh sách SoldierID vào query
    // Sử dụng IN clause với chunking để tránh giới hạn query
    const existingIds: string[] = [];
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < soldierIds.length; i += CHUNK_SIZE) {
      const chunk = soldierIds.slice(i, i + CHUNK_SIZE);

      // Xây dựng query với các parameter
      const request = pool.request();
      const placeholders: string[] = [];

      chunk.forEach((id, idx) => {
        request.input(`id${idx}`, sql.VarChar, id);
        placeholders.push(`@id${idx}`);
      });

      const result = await request.query(
        `SELECT SoldierID FROM Soldier WHERE SoldierID IN (${placeholders.join(', ')})`
      );

      existingIds.push(...result.recordset.map((r: any) => r.SoldierID));
    }

    return NextResponse.json({
      success: true,
      data: { existingIds }
    });

  } catch (error) {
    console.error('Lỗi khi kiểm tra Mã QN tồn tại:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi kiểm tra Mã QN tồn tại' },
      { status: 500 }
    );
  }
}
