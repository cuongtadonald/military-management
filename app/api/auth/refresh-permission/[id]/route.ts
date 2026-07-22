import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'
import { createChangeHistory, ensureAuditTables, FEATURE_LABELS, setUserPermission } from '@/lib/audit'

const ALL_PERMISSION_FEATURES = ['canCreate', 'canEdit', 'canDelete', 'canExport', 'canImport', 'canImportExport']
const REQUEST_STATUS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

function normalizeRequestStatus(status?: string | null) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'pending') return REQUEST_STATUS.pending
  if (value === 'approved') return REQUEST_STATUS.approved
  if (value === 'rejected') return REQUEST_STATUS.rejected
  return status || ''
}

async function ensurePermissionRequestStatuses(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.Status', N'U') IS NOT NULL
    BEGIN
      DECLARE @HasStatusType BIT = CASE WHEN COL_LENGTH('dbo.Status', 'StatusType') IS NULL THEN 0 ELSE 1 END

      IF NOT EXISTS (SELECT 1 FROM dbo.Status WHERE StatusID = 'Pending')
      BEGIN
        IF @HasStatusType = 1
          EXEC sp_executesql
            N'INSERT INTO dbo.Status (StatusID, StatusName, StatusType, Description) VALUES (@StatusID, @StatusName, @StatusType, @Description)',
            N'@StatusID VARCHAR(50), @StatusName NVARCHAR(255), @StatusType VARCHAR(50), @Description NVARCHAR(500)',
            @StatusID = 'Pending', @StatusName = N'Chờ duyệt', @StatusType = 'PERMISSION_REQUEST', @Description = N'Chờ duyệt'
        ELSE
          INSERT INTO dbo.Status (StatusID, StatusName, Description)
          VALUES ('Pending', N'Chờ duyệt', N'Chờ duyệt')
      END

      IF NOT EXISTS (SELECT 1 FROM dbo.Status WHERE StatusID = 'Approved')
      BEGIN
        IF @HasStatusType = 1
          EXEC sp_executesql
            N'INSERT INTO dbo.Status (StatusID, StatusName, StatusType, Description) VALUES (@StatusID, @StatusName, @StatusType, @Description)',
            N'@StatusID VARCHAR(50), @StatusName NVARCHAR(255), @StatusType VARCHAR(50), @Description NVARCHAR(500)',
            @StatusID = 'Approved', @StatusName = N'Đã duyệt', @StatusType = 'PERMISSION_REQUEST', @Description = N'Đã duyệt'
        ELSE
          INSERT INTO dbo.Status (StatusID, StatusName, Description)
          VALUES ('Approved', N'Đã duyệt', N'Đã duyệt')
      END

      IF NOT EXISTS (SELECT 1 FROM dbo.Status WHERE StatusID = 'Rejected')
      BEGIN
        IF @HasStatusType = 1
          EXEC sp_executesql
            N'INSERT INTO dbo.Status (StatusID, StatusName, StatusType, Description) VALUES (@StatusID, @StatusName, @StatusType, @Description)',
            N'@StatusID VARCHAR(50), @StatusName NVARCHAR(255), @StatusType VARCHAR(50), @Description NVARCHAR(500)',
            @StatusID = 'Rejected', @StatusName = N'Đã từ chối', @StatusType = 'PERMISSION_REQUEST', @Description = N'Đã từ chối'
        ELSE
          INSERT INTO dbo.Status (StatusID, StatusName, Description)
          VALUES ('Rejected', N'Đã từ chối', N'Đã từ chối')
      END
    END
  `)
}

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
      .input('Mode', sql.TinyInt, 1)
      .execute('W01P0006')

    return NextResponse.json({ success: true, data: result.recordset?.[0] || null })
  } catch (error) {
    console.error('Lỗi khi gọi W01P0006 Mode 1:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi tải chi tiết yêu cầu mở quyền' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, approvedBy, rejectReason } = body

    if (!id || !approvedBy || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin xét duyệt' }, { status: 400 })
    }

    const pool = await getPool()
    await ensureAuditTables(pool)
    await ensurePermissionRequestStatuses(pool)

    const requestResult = await pool.request()
      .input('RequestID', sql.VarChar, id)
      .query(`
        SELECT PR.RequestID, PR.Title, PR.Content, PR.RequestBy, PR.StatusID,
               requester.UnitID AS RequestByUnitID,
               requester.PermissionLevel AS RequestByPermissionLevel,
               reqUnit.HierarchyPath AS RequestByHierarchyPath,
               approver.UnitID AS ApprovedByUnitID,
               approver.PermissionLevel AS ApprovedByPermissionLevel,
               appUnit.HierarchyPath AS ApprovedByHierarchyPath
        FROM PermissionRequest PR
        INNER JOIN [User] requester ON PR.RequestBy = requester.UserID
        INNER JOIN OrganizationUnit reqUnit ON requester.UnitID = reqUnit.UnitID
        INNER JOIN [User] approver ON approver.UserID = @ApprovedBy
        INNER JOIN OrganizationUnit appUnit ON approver.UnitID = appUnit.UnitID
        WHERE PR.RequestID = @RequestID
      `)

    if (requestResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu' }, { status: 404 })
    }

    const permissionRequest = requestResult.recordset[0]
    if (normalizeRequestStatus(permissionRequest.StatusID) !== REQUEST_STATUS.pending) {
      return NextResponse.json({ success: false, message: 'Yêu cầu đã được xử lý' }, { status: 400 })
    }

    const isSuperiorScope = String(permissionRequest.RequestByHierarchyPath || '').startsWith(String(permissionRequest.ApprovedByHierarchyPath || ''))
    const isHigherLevel = Number(permissionRequest.ApprovedByPermissionLevel || 99) < Number(permissionRequest.RequestByPermissionLevel || 99)
    if (!isSuperiorScope || !isHigherLevel) {
      return NextResponse.json({ success: false, message: 'Bạn không có quyền xét duyệt yêu cầu này' }, { status: 403 })
    }

    if (action === 'approve') {
      // Cập nhật PermissionLevel = 2 (có quyền) cho user được duyệt
      const permissionResult = await setUserPermission(
        pool,
        approvedBy,
        permissionRequest.RequestBy,
        "all",
        true
      )

      await pool.request()
        .input('RequestID', sql.VarChar, id)
        .input('ApprovedBy', sql.VarChar, approvedBy)
        .input('StatusID', sql.VarChar, REQUEST_STATUS.approved)
        .query(`
          UPDATE PermissionRequest
          SET StatusID = @StatusID, ApprovedBy = @ApprovedBy, ApprovedDate = GETDATE(), RejectReason = NULL
          WHERE RequestID = @RequestID
        `)

      try {
        await createChangeHistory({
          pool,
          requestId: id,
          changedBy: approvedBy,
          changeType: 'APPROVE',
          changeReason: `Phê duyệt yêu cầu mở tất cả quyền ${permissionRequest.Title}`,
          description: `Mở tất cả quyền chức năng cho user ${permissionRequest.RequestBy}`,
          totalSoldier: 0,
          details: [{
            soldierId: null,
            fieldName: 'PermissionLevel',
            fieldDisplayName: 'Mức phân quyền',
            oldValue: permissionResult.oldValue,
            newValue: true,
          }],
        })
      } catch (auditError) {
        console.error('Đã phê duyệt yêu cầu nhưng lỗi khi ghi lịch sử:', auditError)
      }

      return NextResponse.json({
        success: true,
        message: 'Đã phê duyệt và mở tất cả quyền',
        affectedUserId: permissionRequest.RequestBy,
        permissionLevel: 2,
      })
    }

    await pool.request()
      .input('RequestID', sql.VarChar, id)
      .input('ApprovedBy', sql.VarChar, approvedBy)
      .input('StatusID', sql.VarChar, REQUEST_STATUS.rejected)
      .input('RejectReason', sql.NVarChar, rejectReason || null)
      .query(`
        UPDATE PermissionRequest
        SET StatusID = @StatusID, ApprovedBy = @ApprovedBy, ApprovedDate = GETDATE(), RejectReason = @RejectReason
        WHERE RequestID = @RequestID
      `)

    try {
      await createChangeHistory({
        pool,
        requestId: id,
        changedBy: approvedBy,
        changeType: 'REJECT',
        changeReason: rejectReason || `Từ chối yêu cầu mở quyền ${permissionRequest.Title}`,
        description: `Từ chối yêu cầu mở quyền của user ${permissionRequest.RequestBy}`,
        totalSoldier: 0,
        details: ALL_PERMISSION_FEATURES.map((code) => ({
          soldierId: null,
          fieldName: code,
          fieldDisplayName: FEATURE_LABELS[code] || code,
          oldValue: REQUEST_STATUS.pending,
          newValue: REQUEST_STATUS.rejected,
        })),
      })
    } catch (auditError) {
      console.error('Đã từ chối yêu cầu nhưng lỗi khi ghi lịch sử:', auditError)
    }

    return NextResponse.json({ success: true, message: 'Đã từ chối yêu cầu' })
  } catch (error) {
    console.error('Lỗi khi xét duyệt yêu cầu mở quyền:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi xét duyệt yêu cầu mở quyền' }, { status: 500 })
  }
}