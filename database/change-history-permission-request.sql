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
GO

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
GO

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
GO
