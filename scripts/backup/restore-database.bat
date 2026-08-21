@echo off
chcp 65001 >nul
REM ============================================================
REM Script: Restore Database từ Backup
REM Mô tả: Khôi phục database từ file .bak
REM Yêu cầu: Chạy với quyền Administrator
REM ============================================================

setlocal enabledelayedexpansion

echo ============================================================
echo RESTORE DATABASE TỪ BACKUP
echo ============================================================
echo.

REM Kiểm tra quyền Admin
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Vui lòng chạy script này với quyền Administrator!
    pause
    exit /b 1
)

REM Cấu hình
set "APP_DIR=C:\QuanLyQuanLuc"
set "BACKUP_ROOT=C:\QuanLyQuanLuc_Backups"

REM Đọc thông tin database từ .env.local
set "DB_SERVER=localhost"
set "DB_NAME=QlyQuanLuc"
set "DB_USER=quanluc"
set "DB_PASSWORD="

if exist "%APP_DIR%\.env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%APP_DIR%\.env.local") do (
        if "%%a"=="DB_SERVER" set "DB_SERVER=%%b"
        if "%%a"=="DB_NAME" set "DB_NAME=%%b"
        if "%%a"=="DB_USER" set "DB_USER=%%b"
        if "%%a"=="DB_PASSWORD" set "DB_PASSWORD=%%b"
    )
)

echo Thông tin database:
echo   Server: %DB_SERVER%
echo   Database: %DB_NAME%
echo.

REM Liệt kê các backup có sẵn
echo Các backup database có sẵn:
echo.
set count=0
for %%f in ("%BACKUP_ROOT%\Database\*.bak") do (
    set /a count+=1
    echo   !count!. %%~nxf
    set "backup_!count!=%%f"
)

if %count% EQU 0 (
    echo   Không có backup nào trong %BACKUP_ROOT%\Database
    pause
    exit /b 1
)

echo.
set /p choice="Chọn backup để restore (1-%count%): "

set "SELECTED_BACKUP=!backup_%choice%!"
if not defined SELECTED_BACKUP (
    echo [LOI] Lựa chọn không hợp lệ!
    pause
    exit /b 1
)

echo.
echo Bạn đã chọn: %SELECTED_BACKUP%
echo.
echo [CANH BAO] Restore sẽ ghi đè lên database hiện tại!
echo Dữ liệu hiện tại sẽ bị mất!
echo.
set /p confirm="Gõ YES để tiếp tục, gõ bất kỳ để hủy: "

if /i not "%confirm%"=="YES" (
    echo Đã hủy restore.
    pause
    exit /b 0
)

echo.
echo Đang restore database...

REM Tạo script SQL restore
set "RESTORE_SQL=%TEMP%\restore.sql"
set "DATA_PATH="
set "LOG_PATH="

REM Tạo file SQL restore
(
    echo USE master;
    echo GO
    echo.
    echo ALTER DATABASE [%DB_NAME%] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    echo GO
    echo.
    echo RESTORE DATABASE [%DB_NAME%]
    echo FROM DISK = '%SELECTED_BACKUP%'
    echo WITH REPLACE, RECOVERY;
    echo GO
    echo.
    echo ALTER DATABASE [%DB_NAME%] SET MULTI_USER;
    echo GO
) > "%RESTORE_SQL%"

REM Chạy restore
sqlcmd -S %DB_SERVER% -U %DB_USER% -P %DB_PASSWORD% -i "%RESTORE_SQL%" -b

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [OK] RESTORE DATABASE THÀNH CÔNG
    echo ============================================================
    echo Database %DB_NAME% đã được restore từ:
    echo %SELECTED_BACKUP%
) else (
    echo.
    echo [LOI] Restore database thất bại!
    echo Vui lòng kiểm tra log và thử lại.
)

REM Xóa file SQL tạm
del "%RESTORE_SQL%" 2>nul

echo.
pause
