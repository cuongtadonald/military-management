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
  const { pool, requestId = null, changedBy, changeType, changeReason = null, totalSoldier = 0, description = null, details = [] } = input

  if (!changedBy) return null

  await ensureAuditTables(pool)

  const changeHistoryId = makeId('CH')
  await pool.request()
    .input('ChangeHistoryID', sql.VarChar, changeHistoryId)
    .input('RequestID', sql.VarChar, requestId)
    .input('ChangedBy', sql.VarChar, changedBy)
    .input('ChangeType', sql.VarChar, changeType)
    .input('ChangeReason', sql.NVarChar, changeReason)
    .input('TotalSoldier', sql.Int, totalSoldier)
    .input('Description', sql.NVarChar, description)
    .query(`
      INSERT INTO ChangeHistory (
        ChangeHistoryID, RequestID, ChangeDate, ChangedBy, ChangeType,
        ChangeReason, TotalSoldier, Description
      ) VALUES (
        @ChangeHistoryID, @RequestID, GETDATE(), @ChangedBy, @ChangeType,
        @ChangeReason, @TotalSoldier, @Description
      )
    `)

  for (const detail of details) {
    await pool.request()
      .input('DetailID', sql.VarChar, makeId('CHD'))
      .input('ChangeHistoryID', sql.VarChar, changeHistoryId)
      .input('SoldierID', sql.VarChar, detail.soldierId ?? null)
      .input('FieldName', sql.VarChar, detail.fieldName)
      .input('FieldDisplayName', sql.NVarChar, detail.fieldDisplayName)
      .input('OldValue', sql.NVarChar, stringifyValue(detail.oldValue))
      .input('NewValue', sql.NVarChar, stringifyValue(detail.newValue))
      .query(`
        INSERT INTO ChangeHistoryDetail (
          DetailID, ChangeHistoryID, SoldierID, FieldName, FieldDisplayName, OldValue, NewValue
        ) VALUES (
          @DetailID, @ChangeHistoryID, @SoldierID, @FieldName, @FieldDisplayName, @OldValue, @NewValue
        )
      `)
  }

  return changeHistoryId
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

async function ensureUserFeaturePermissionTable(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.UserFeaturePermission', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.UserFeaturePermission (
        PermissionID VARCHAR(50) NOT NULL PRIMARY KEY,
        GrantedByUserID VARCHAR(50) NOT NULL,
        GrantedToUserID VARCHAR(50) NOT NULL,
        FeatureCode VARCHAR(100) NOT NULL,
        IsEnabled BIT NOT NULL DEFAULT 0,
        GrantedDate DATETIME NOT NULL DEFAULT GETDATE(),
        LastModifiedDate DATETIME NULL,
        LastModifiedBy VARCHAR(50) NULL
      )
    END
  `)
}

export async function setUserPermission(
  pool: sql.ConnectionPool,
  grantedByUserId: string,
  grantedToUserId: string,
  featureCode: string,
  isEnabled: boolean,
) {
  await ensureUserFeaturePermissionTable(pool)

  const checkResult = await pool.request()
    .input('grantedToUserId', sql.VarChar, grantedToUserId)
    .input('featureCode', sql.VarChar, featureCode)
    .query(`
      SELECT PermissionID, IsEnabled
      FROM UserFeaturePermission
      WHERE GrantedToUserID = @grantedToUserId AND FeatureCode = @featureCode
    `)

  const oldValue = checkResult.recordset[0]?.IsEnabled === undefined
    ? null
    : Boolean(checkResult.recordset[0].IsEnabled)

  if (checkResult.recordset.length > 0) {
    await pool.request()
      .input('grantedToUserId', sql.VarChar, grantedToUserId)
      .input('featureCode', sql.VarChar, featureCode)
      .input('isEnabled', sql.Bit, isEnabled ? 1 : 0)
      .input('lastModifiedBy', sql.VarChar, grantedByUserId)
      .query(`
        UPDATE UserFeaturePermission
        SET IsEnabled = @isEnabled,
            LastModifiedDate = GETDATE(),
            LastModifiedBy = @lastModifiedBy
        WHERE GrantedToUserID = @grantedToUserId AND FeatureCode = @featureCode
      `)
  } else {
    await pool.request()
      .input('permissionId', sql.VarChar, makeShortId('PERM'))
      .input('grantedByUserId', sql.VarChar, grantedByUserId)
      .input('grantedToUserId', sql.VarChar, grantedToUserId)
      .input('featureCode', sql.VarChar, featureCode)
      .input('isEnabled', sql.Bit, isEnabled ? 1 : 0)
      .query(`
        INSERT INTO UserFeaturePermission
          (PermissionID, GrantedByUserID, GrantedToUserID, FeatureCode, IsEnabled, GrantedDate, LastModifiedDate, LastModifiedBy)
        VALUES
          (@permissionId, @grantedByUserId, @grantedToUserId, @featureCode, @isEnabled, GETDATE(), GETDATE(), @grantedByUserId)
      `)
  }

  return { oldValue, newValue: isEnabled }
}