import sql from 'mssql'

export interface ChangeHistoryDetailInput {
  soldierId?: string | null
  fieldName: string
  fieldDisplayName: string
  oldValue?: unknown
  newValue?: unknown
}

export interface CreateChangeHistoryInput {
  pool: sql.ConnectionPool
  requestId?: string | null
  changedBy: string
  changeType: string
  changeReason?: string | null
  totalSoldier?: number
  description?: string | null
  details?: ChangeHistoryDetailInput[]
}

export const FEATURE_LABELS: Record<string, string> = {
  canCreate: 'Thêm chiến sĩ',
  canEdit: 'Sửa chiến sĩ',
  canDelete: 'Xoá chiến sĩ',
  canExport: 'Xuất Excel',
  canImport: 'Nhập Excel',
  canImportExport: 'Nhập/Xuất Excel',
  canCreateRequest: 'Gửi yêu cầu thay đổi',
  canApproveRequest: 'Phê duyệt yêu cầu thay đổi',
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function makeShortId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
}

function stringifyValue(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export async function ensureAuditTables(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.ChangeHistory', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ChangeHistory (
        ChangeHistoryID VARCHAR(50) NOT NULL PRIMARY KEY,
        RequestID VARCHAR(50) NULL,
        ChangeDate DATETIME NOT NULL DEFAULT GETDATE(),
        ChangedBy VARCHAR(50) NOT NULL,
        ChangeType VARCHAR(20) NOT NULL,
        ChangeReason NVARCHAR(1000) NULL,
        TotalSoldier INT NULL DEFAULT 0,
        Description NVARCHAR(500) NULL
      )
    END

    IF OBJECT_ID(N'dbo.ChangeHistoryDetail', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ChangeHistoryDetail (
        DetailID VARCHAR(50) NOT NULL PRIMARY KEY,
        ChangeHistoryID VARCHAR(50) NOT NULL,
        SoldierID VARCHAR(20) NULL,
        FieldName VARCHAR(100) NOT NULL,
        FieldDisplayName NVARCHAR(200) NULL,
        OldValue NVARCHAR(MAX) NULL,
        NewValue NVARCHAR(MAX) NULL,
        CONSTRAINT FK_ChangeHistoryDetail_ChangeHistory
          FOREIGN KEY (ChangeHistoryID) REFERENCES dbo.ChangeHistory(ChangeHistoryID)
      )
    END

    IF OBJECT_ID(N'dbo.PermissionRequest', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.PermissionRequest (
        RequestID VARCHAR(50) NOT NULL PRIMARY KEY,
        Title NVARCHAR(300) NOT NULL,
        Content NVARCHAR(MAX) NULL,
        RequestBy VARCHAR(50) NOT NULL,
        StatusID VARCHAR(50) NOT NULL DEFAULT 'Pending',
        RequestDate DATETIME NOT NULL DEFAULT GETDATE(),
        ApprovedDate DATETIME NULL,
        ApprovedBy VARCHAR(50) NULL,
        RejectReason NVARCHAR(500) NULL,
        Description NVARCHAR(500) NULL,
        ExpiredDate DATETIME NULL
      )
    END
  `)
}

export async function createChangeHistory(input: CreateChangeHistoryInput) {
  const {
    pool,
    requestId = null,
    changedBy,
    changeType,
    changeReason = null,
    totalSoldier = 0,
    description = null,
    details = [],
  } = input

  if (!changedBy) return null

  try {
    console.log("===== CREATE CHANGE HISTORY =====")
    console.log(input)

    await ensureAuditTables(pool)

    const changeHistoryId = makeId("CH")

    console.log("Insert ChangeHistory...")

    await pool.request()
      .input("ChangeHistoryID", sql.VarChar, changeHistoryId)
      .input("RequestID", sql.VarChar, requestId)
      .input("ChangedBy", sql.VarChar, changedBy)
      .input("ChangeType", sql.VarChar, changeType)
      .input("ChangeReason", sql.NVarChar(sql.MAX), changeReason)
      .input("TotalSoldier", sql.Int, totalSoldier)
      .input("Description", sql.NVarChar(sql.MAX), description)
      .query(`
        INSERT INTO ChangeHistory (
          ChangeHistoryID,
          RequestID,
          ChangeDate,
          ChangedBy,
          ChangeType,
          ChangeReason,
          TotalSoldier,
          Description
        )
        VALUES (
          @ChangeHistoryID,
          @RequestID,
          GETDATE(),
          @ChangedBy,
          @ChangeType,
          @ChangeReason,
          @TotalSoldier,
          @Description
        )
      `)

    console.log("Insert ChangeHistory thành công")

    for (const detail of details) {
      console.log("Insert Detail:", detail)

      await pool.request()
        .input("DetailID", sql.VarChar, makeId("CHD"))
        .input("ChangeHistoryID", sql.VarChar, changeHistoryId)
        .input("SoldierID", sql.VarChar, detail.soldierId ?? null)
        .input("FieldName", sql.VarChar, detail.fieldName)
        .input("FieldDisplayName", sql.NVarChar(sql.MAX), detail.fieldDisplayName)
        .input("OldValue", sql.NVarChar(sql.MAX), stringifyValue(detail.oldValue))
        .input("NewValue", sql.NVarChar(sql.MAX), stringifyValue(detail.newValue))
        .query(`
          INSERT INTO ChangeHistoryDetail (
            DetailID,
            ChangeHistoryID,
            SoldierID,
            FieldName,
            FieldDisplayName,
            OldValue,
            NewValue
          )
          VALUES (
            @DetailID,
            @ChangeHistoryID,
            @SoldierID,
            @FieldName,
            @FieldDisplayName,
            @OldValue,
            @NewValue
          )
        `)
    }

    console.log("Insert ChangeHistoryDetail thành công")

    return changeHistoryId

  } catch (err: any) {
    console.error("======================================")
    console.error("LỖI createChangeHistory")
    console.error(err)
    console.error("Message:", err.message)
    console.error("Number:", err.number)
    console.error("State:", err.state)
    console.error("Line:", err.lineNumber)
    console.error("======================================")

    throw err
  }
}

export async function getUserScope(pool: sql.ConnectionPool, userId: string) {
  const result = await pool.request()
    .input('UserID', sql.VarChar, userId)
    .query(`
      SELECT u.UserID, u.UnitID, u.PermissionLevel, ou.HierarchyPath
      FROM [User] u
      LEFT JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
      WHERE u.UserID = @UserID
    `)

  return result.recordset[0] || null
}

export async function getVisibleUserIds(pool: sql.ConnectionPool, userId: string) {
  const scope = await getUserScope(pool, userId)
  if (!scope?.HierarchyPath) return [userId]

  const result = await pool.request()
    .input('HierarchyPath', sql.VarChar, `${scope.HierarchyPath}%`)
    .query(`
      SELECT u.UserID
      FROM [User] u
      INNER JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
      WHERE ou.HierarchyPath LIKE @HierarchyPath
    `)

  return result.recordset.map((row: any) => row.UserID)
}

/**
 * Cập nhật quyền user bằng cách thay đổi PermissionLevel trực tiếp trên bảng User.
 *
 * Logic:
 *   - isEnabled = true  → PermissionLevel = 2 (có quyền: Thêm, Sửa, Xóa, Nhập/Xuất Excel)
 *   - isEnabled = false → PermissionLevel = 3 (bị giới hạn, ẩn toàn bộ chức năng)
 *
 * Không còn sử dụng bảng UserFeaturePermission riêng lẻ.
 */
export async function setUserPermission(
  pool: sql.ConnectionPool,
  _grantedByUserId: string,
  grantedToUserId: string,
  _featureCode: string,
  isEnabled: boolean,
) {
  const newPermissionLevel = isEnabled ? 2 : 3

  // Lấy PermissionLevel hiện tại để phục vụ audit
  const checkResult = await pool.request()
    .input('userId', sql.VarChar, grantedToUserId)
    .query(`
      SELECT PermissionLevel
      FROM [User]
      WHERE UserID = @userId
    `)

  const oldPermissionLevel = checkResult.recordset[0]?.PermissionLevel ?? null

  // Cập nhật PermissionLevel trực tiếp trên bảng User
  await pool.request()
    .input('userId', sql.VarChar, grantedToUserId)
    .input('permissionLevel', sql.Int, newPermissionLevel)
    .query(`
      UPDATE [User]
      SET PermissionLevel = @permissionLevel
      WHERE UserID = @userId
    `)

  return {
    oldValue: oldPermissionLevel === 2,
    newValue: isEnabled,
  }
}