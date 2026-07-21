import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'
import { 
  createChangeHistory, 
  ensureAuditTables, 
  FEATURE_LABELS,
  setUserPermission
} from '@/lib/audit'

const ALL_PERMISSION_FEATURES = ['canCreate', 'canEdit', 'canDelete', 'canExport', 'canImport', 'canImportExport']
const REQUEST_STATUS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

function makeRequestId() {
  // Keep ID <= 20 chars because some existing DB schemas define
  // ChangeHistory.RequestID as VARCHAR(20).
  return `PR${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase()
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
    await ensurePermissionRequestStatuses(pool)

    const requesterResult = await pool.request()
      .input('RequestBy', sql.VarChar, requestBy)
      .query(`
        SELECT TOP 1 UserID
        FROM [User] WITH(NOLOCK)
        WHERE UserID = @RequestBy
      `)

    if (requesterResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người gửi yêu cầu' }, { status: 404 })
    }

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
      .input('StatusID', sql.VarChar, REQUEST_STATUS.pending)
      .input('Description', sql.NVarChar, requestDescription)
      .input('ExpiredDate', sql.DateTime, expiredDate || null)
      .query(`
        INSERT INTO PermissionRequest (
          RequestID, Title, Content, RequestBy, StatusID, RequestDate,
          Description, ExpiredDate
        ) VALUES (
          @RequestID, @Title, @Content, @RequestBy, @StatusID, GETDATE(),
          @Description, @ExpiredDate
        )
      `)

    try {
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
          newValue: REQUEST_STATUS.pending,
        })),
      })
    } catch (auditError) {
      console.error('Đã tạo yêu cầu nhưng lỗi khi ghi lịch sử mở quyền:', auditError)
    }

    return NextResponse.json({ success: true, message: 'Đã gửi yêu cầu mở quyền', data: { RequestID: requestId } })
  } catch (error) {
    console.error('Lỗi khi gửi yêu cầu mở quyền:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi gửi yêu cầu mở quyền' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      requestId,
      approvedBy
    } = body

    if (!requestId || !approvedBy) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin duyệt" },
        { status: 400 }
      )
    }

    const pool = await getPool()

    // 1. Lấy người yêu cầu
    const requestResult = await pool.request()
      .input("RequestID", sql.VarChar, requestId)
      .query(`
        SELECT RequestBy
        FROM PermissionRequest
        WHERE RequestID = @RequestID
      `)


    if (requestResult.recordset.length === 0) {
      return NextResponse.json(
        { success:false, message:"Không tìm thấy yêu cầu" },
        { status:404 }
      )
    }


    const requestBy = requestResult.recordset[0].RequestBy


    // // 2. CẤP QUYỀN GIỐNG TRANG QUẢN LÝ QUYỀN
    // const permissionResponse = await fetch(
    //   `${process.env.NEXT_PUBLIC_APP_URL}/api/permissions`,
    //   {
    //     method:"POST",
    //     headers:{
    //       "Content-Type":"application/json"
    //     },
    //     body:JSON.stringify({
    //       grantedByUserId: approvedBy,
    //       grantedToUserId: requestBy,
    //       featureCode:"all",
    //       isEnabled:true
    //     })
    //   }
    // )


    // const permissionResult = await permissionResponse.json()

    // if(!permissionResult.success){
    //   throw new Error(permissionResult.message)
    // }

    await setUserPermission(
        pool,
        approvedBy,
        requestBy,
        "all",
        true
      )

    // 3. Cập nhật trạng thái yêu cầu
    await pool.request()
      .input("RequestID", sql.VarChar, requestId)
      .input("ApprovedBy", sql.VarChar, approvedBy)
      .query(`
        UPDATE PermissionRequest
        SET 
          StatusID = 'Approved',
          ApprovedDate = GETDATE(),
          ApprovedBy = @ApprovedBy
        WHERE RequestID = @RequestID
      `)


    return NextResponse.json({
      success:true,
      message:"Đã duyệt và cấp quyền thành công"
    })


  } catch(error:any){

  console.error("Lỗi duyệt yêu cầu:", error)

  return NextResponse.json(
    {
      success:false,
      message: error?.message || "Lỗi khi duyệt yêu cầu",
      detail: error?.stack || error
    },
    {
      status:500
    }
  )
}
}