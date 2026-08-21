-- ============================================================
-- Script: Backup SQL Server Database
-- Mô tả: Tạo file backup .bak cho database QlyQuanLuc
-- Cách dùng: Chạy qua sqlcmd hoặc SQL Server Management Studio
-- ============================================================

DECLARE @BackupPath NVARCHAR(500)
DECLARE @DatabaseName NVARCHAR(100) = 'QlyQuanLuc'
DECLARE @Date NVARCHAR(20)

-- Tạo tên file backup với timestamp
SET @Date = FORMAT(GETDATE(), 'yyyyMMdd_HHmmss')
SET @BackupPath = 'C:\QuanLyQuanLuc_Backups\Database\' + @DatabaseName + '_' + @Date + '.bak'

-- Tạo thư mục nếu chưa có (cần chạy qua xp_cmdshell hoặc tạo sẵn)
-- EXEC xp_cmdshell 'mkdir C:\QuanLyQuanLuc_Backups\Database'

-- Thực hiện backup
BACKUP DATABASE @DatabaseName
TO DISK = @BackupPath
WITH 
    COMPRESSION,
    STATS = 10,
    CHECKSUM

PRINT N'Backup hoàn tất: ' + @BackupPath
GO

-- Xóa các backup cũ hơn 6 tháng (tùy chọn)
DECLARE @OldBackupDate DATETIME = DATEADD(MONTH, -6, GETDATE())
DECLARE @BackupFile NVARCHAR(500)

DECLARE backup_cursor CURSOR FOR
SELECT physical_device_name
FROM msdb.dbo.backupmediafamily
WHERE media_set_id IN (
    SELECT media_set_id
    FROM msdb.dbo.backupset
    WHERE database_name = 'QlyQuanLuc'
    AND backup_finish_date < @OldBackupDate
)

OPEN backup_cursor
FETCH NEXT FROM backup_cursor INTO @BackupFile

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT N'Xóa backup cũ: ' + @BackupFile
    -- EXEC xp_cmdshell 'del "' + @BackupFile + '"'
    FETCH NEXT FROM backup_cursor INTO @BackupFile
END

CLOSE backup_cursor
DEALLOCATE backup_cursor
GO
