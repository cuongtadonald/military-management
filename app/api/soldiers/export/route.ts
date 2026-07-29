/**
 * File: app/api/soldiers/export/route.ts
 * Mô tả: API xuất danh sách quân nhân (Excel/JSON)
 * Cập nhật: 2026-07-25
 *
 * GET /api/soldiers/export?userId=U001&mode=0
 *   - mode = 0: đang công tác (mặc định)
 *   - mode = 1: đã xuất ngũ
 *
 * Ghi chú: route cũ truy vấn thẳng bảng "Soldiers" (không tồn tại).
 * Bản mới dùng SP W01P0001 giống endpoint /api/soldiers để đảm bảo
 * đúng phân quyền theo HierarchyPath và đồng bộ dữ liệu hiển thị.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || ''
    const mode = searchParams.get('mode') || '0'

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      )
    }

    const pool = await getPool()

    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('Mode', sql.VarChar, mode)
      .execute('W01P0001')

    const data = (result.recordset || []).map((row: any) => ({
      SoldierID: row.SoldierID,
      FullName: row.FullName,
      Gender: row.Gender === 1 ? 'Nam' : row.Gender === 0 ? 'Nữ' : '',
      DateOfBirth: row.DateOfBirth,
      CitizenID: row.CitizenID,
      UnitName: row.UnitName,
      UnitFullPath: row.FullPathName,
      Position: row.Position,
      RankName: row.RankName,
      StatusName: row.StatusName,
      EnlistmentDate: row.EnlistmentDate,
    }))

    return NextResponse.json({ success: true, data, total: data.length })
  } catch (error) {
    console.error('Lỗi khi xuất danh sách quân nhân:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xuất dữ liệu' },
      { status: 500 }
    )
  }
}
