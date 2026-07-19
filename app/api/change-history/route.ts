import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu UserID' }, { status: 400 })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('Mode', sql.TinyInt, 0)
      .execute('W01P0005')

    return NextResponse.json({ success: true, data: result.recordset || [] })
  } catch (error) {
    console.error('Lỗi khi gọi W01P0005 Mode 0:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi tải lịch sử thay đổi' }, { status: 500 })
  }
}
