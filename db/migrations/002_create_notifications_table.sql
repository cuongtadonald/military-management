-- Migration: Tạo bảng Notifications
-- Ngày: 2026-08-04
-- Mô tả: Bảng lưu trữ thông báo trong hệ thống

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [NotificationID] NVARCHAR(50) NOT NULL PRIMARY KEY,
        [Title] NVARCHAR(255) NOT NULL,
        [Content] NVARCHAR(MAX) NOT NULL,
        [NotificationType] NVARCHAR(20) NOT NULL DEFAULT 'INFO',
        [CreatedBy] NVARCHAR(50) NOT NULL,
        [RecipientUserID] NVARCHAR(50) NULL,
        [TargetUnitID] NVARCHAR(50) NULL,
        [IsGlobal] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [IsRead] BIT NOT NULL DEFAULT 0,
        [ReadAt] DATETIME NULL,
        
        -- Foreign Keys
        CONSTRAINT [FK_Notifications_Creator] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT [FK_Notifications_Recipient] FOREIGN KEY ([RecipientUserID]) REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT [FK_Notifications_Unit] FOREIGN KEY ([TargetUnitID]) REFERENCES [dbo].[Unit]([UnitID])
    );

    -- Indexes for performance
    CREATE NONCLUSTERED INDEX [IX_Notifications_Recipient] ON [dbo].[Notifications]([RecipientUserID]);
    CREATE NONCLUSTERED INDEX [IX_Notifications_Unit] ON [dbo].[Notifications]([TargetUnitID]);
    CREATE NONCLUSTERED INDEX [IX_Notifications_IsRead] ON [dbo].[Notifications]([IsRead]);
    CREATE NONCLUSTERED INDEX [IX_Notifications_CreatedAt] ON [dbo].[Notifications]([CreatedAt] DESC);
    
    PRINT 'Đã tạo bảng Notifications thành công';
END
ELSE
BEGIN
    PRINT 'Bảng Notifications đã tồn tại';
END
GO
