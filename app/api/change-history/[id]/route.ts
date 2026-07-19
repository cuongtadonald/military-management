import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId || !id) {
      return NextResponse.json({ success: false, message: 'Thiếu tham số' }, { status: 400 })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('ID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 0)
      .execute('W01P0006')

    return NextResponse.json({
      success: true,
      data: {
        header: result.recordsets?.[0]?.[0] || null,
        details: result.recordsets?.[1] || [],
      },
    })
  } catch (error) {
    console.error('Lỗi khi gọi W01P0006 Mode 0:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi tải chi tiết lịch sử thay đổi' }, { status: 500 })
  }
}
