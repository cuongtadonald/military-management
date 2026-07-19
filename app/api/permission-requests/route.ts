import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'
import { createChangeHistory, ensureAuditTables, FEATURE_LABELS } from '@/lib/audit'

const ALL_PERMISSION_FEATURES = ['canCreate', 'canEdit', 'canDelete', 'canExport', 'canImport']

function makeRequestId() {
  return `PR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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
      .input('Mode', sql.TinyInt, 1)
      .execute('W01P0005')

    return NextResponse.json({
      success: true,
      data: (result.recordset || []).map((row: any) => ({
        ...row,
        contentData: {
          featureCodes: ALL_PERMISSION_FEATURES,
          featureLabels: ALL_PERMISSION_FEATURES.map((code) => FEATURE_LABELS[code] || code),
        },
      })),
    })
  } catch (error) {
    console.error('Lỗi khi gọi W01P0005 Mode 1:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi tải yêu cầu mở quyền' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestBy, title, content, description, expiredDate } = body

    if (!requestBy) {
      return NextResponse.json({ success: false, message: 'Thiếu người gửi yêu cầu' }, { status: 400 })
    }

    const pool = await getPool()
    await ensureAuditTables(pool)

    const requestId = makeRequestId()
    const requestTitle = title || 'Yêu cầu mở tất cả quyền chức năng'
    const requestDescription = description || content || 'Yêu cầu cấp trên mở tất cả quyền chức năng'
    const contentData = {
      message: requestDescription,
      featureCodes: ALL_PERMISSION_FEATURES,
      featureLabels: ALL_PERMISSION_FEATURES.map((code) => FEATURE_LABELS[code] || code),
    }

    await pool.request()
      .input('RequestID', sql.VarChar, requestId)
      .input('Title', sql.NVarChar, requestTitle)
      .input('Content', sql.NVarChar, JSON.stringify(contentData))
      .input('RequestBy', sql.VarChar, requestBy)
      .input('Description', sql.NVarChar, requestDescription)
      .input('ExpiredDate', sql.DateTime, expiredDate || null)
      .query(`
        INSERT INTO PermissionRequest (
          RequestID, Title, Content, RequestBy, StatusID, RequestDate,
          Description, ExpiredDate
        ) VALUES (
          @RequestID, @Title, @Content, @RequestBy, 'Pending', GETDATE(),
          @Description, @ExpiredDate
        )
      `)

    await createChangeHistory({
      pool,
      requestId,
      changedBy: requestBy,
      changeType: 'REQUEST',
      changeReason: requestDescription,
      description: requestTitle,
      totalSoldier: 0,
      details: ALL_PERMISSION_FEATURES.map((code) => ({
        soldierId: null,
        fieldName: code,
        fieldDisplayName: FEATURE_LABELS[code] || code,
        oldValue: false,
        newValue: 'Pending',
      })),
    })

    return NextResponse.json({ success: true, message: 'Đã gửi yêu cầu mở quyền', data: { RequestID: requestId } })
  } catch (error) {
    console.error('Lỗi khi gửi yêu cầu mở quyền:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi gửi yêu cầu mở quyền' }, { status: 500 })
  }
}
