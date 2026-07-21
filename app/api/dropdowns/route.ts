/**
 * File: app/api/dropdowns/route.ts
 * Mô tả: API lấy dữ liệu dropdown từ SP W01P0002
 * Cập nhật: 2026-07-03
 * 
 * Modes:
 *   - RANK: Danh sách cấp bậc
 *   - PROVINCE: Danh sách tỉnh/thành phố
 *   - WARD: Danh sách xã/phường (có ProvinceID)
 *   - RELIGION: Danh sách tôn giáo
 *   - MARITAL: Danh sách tình trạng hôn nhân
 *   - STATUS_SOLDIER: Danh sách trạng thái chiến sĩ
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
const mode = searchParams.get('mode') || '';

const validModes = [
  'RANK',
  'PROVINCE',
  'WARD',
  'RELIGION',
  'MARITAL',
  'STATUS_SOLDIER'
];

if (!validModes.includes(mode)) {
  return NextResponse.json(
    { 
      success: false, 
      message: 'Mode không hợp lệ' 
    },
    { status: 400 }
  );
}

    if (!userId || !mode) {
      return NextResponse.json(
        { success: false, message: 'Thiếu tham số' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Gọi SP W01P0002
      const result = await pool.request()
        .input('UserID', sql.VarChar, userId)
        .input('Mode', sql.VarChar, mode)
        .execute('W01P0002');
    if (mode === 'UNIT') {
      return NextResponse.json({
        success: true,
        data: result.recordset.map(item => ({
          value: item.UnitID,
          label: item.UnitFullPathName
        })),
      });
    }
    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error('Lỗi khi lấy dropdown:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu' },
      { status: 500 }
    );
  }
}