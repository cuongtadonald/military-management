@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM QUAN LY QUAN LUC - BACKUP ALL
REM Portable / Hardcore version
REM
REM Cau truc:
REM   <PROJECT>\
REM       scripts\
REM           backup\
REM               backup-all.bat
REM               backup-files.bat
REM
REM Project tu dong lay tu:
REM   %~dp0\..\..
REM ============================================================

REM ============================================================
REM 1. AUTO DETECT PATH
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%..\.."

REM Loai bo dau \ cuoi neu co
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

REM ============================================================
REM 2. BACKUP ROOT
REM
REM Mac dinh backup nam o:
REM   C:\QuanLyQuanLuc_Backups
REM
REM Co the doi bang bien moi truong:
REM   set QLQD_BACKUP_ROOT=D:\Backups\QuanLyQuanLuc
REM ============================================================

if defined QLQD_BACKUP_ROOT (
    set "BACKUP_ROOT=%QLQD_BACKUP_ROOT%"
) else (
    set "BACKUP_ROOT=C:\QuanLyQuanLuc_Backups"
)

set "BACKUP_DB_DIR=%BACKUP_ROOT%\Database"
set "BACKUP_FILES_DIR=%BACKUP_ROOT%\Files"
set "LOG_FILE=%BACKUP_ROOT%\backup.log"

REM ============================================================
REM 3. DATABASE CONFIG
REM ============================================================

set "DB_SERVER=localhost"
set "DB_PORT=1433"
set "DB_NAME=QUANLUC"
set "DB_USER=quanluc"
set "DB_PASSWORD="

REM ============================================================
REM 4. DOC .env.local NEU CO
REM
REM Ho tro:
REM DB_SERVER=
REM DB_PORT=
REM DB_NAME=
REM DB_USER=
REM DB_PASSWORD=
REM ============================================================

if exist "%APP_DIR%\.env.local" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%APP_DIR%\.env.local") do (

        if /I "%%A"=="DB_SERVER" (
            set "DB_SERVER=%%B"
        )

        if /I "%%A"=="DB_PORT" (
            set "DB_PORT=%%B"
        )

        if /I "%%A"=="DB_NAME" (
            set "DB_NAME=%%B"
        )

        if /I "%%A"=="DB_USER" (
            set "DB_USER=%%B"
        )

        if /I "%%A"=="DB_PASSWORD" (
            set "DB_PASSWORD=%%B"
        )
    )
)

REM Remove surrounding quotes
set "DB_SERVER=%DB_SERVER:"=%"
set "DB_PORT=%DB_PORT:"=%"
set "DB_NAME=%DB_NAME:"=%"
set "DB_USER=%DB_USER:"=%"
set "DB_PASSWORD=%DB_PASSWORD:"=%"

set "SQL_SERVER=%DB_SERVER%,%DB_PORT%"

REM ============================================================
REM 5. CHECK PROJECT
REM ============================================================

if not exist "%APP_DIR%\" (
    echo.
    echo ============================================================
    echo [LOI] KHONG TIM THAY PROJECT
    echo ============================================================
    echo Project:
    echo %APP_DIR%
    echo.
    exit /b 1
)

if not exist "%APP_DIR%\scripts\backup\backup-files.bat" (
    echo.
    echo [LOI] Khong tim thay:
    echo %APP_DIR%\scripts\backup\backup-files.bat
    echo.
    exit /b 1
)

REM ============================================================
REM 6. CREATE BACKUP DIRECTORIES
REM ============================================================

if not exist "%BACKUP_ROOT%\" mkdir "%BACKUP_ROOT%"
if not exist "%BACKUP_DB_DIR%\" mkdir "%BACKUP_DB_DIR%"
if not exist "%BACKUP_FILES_DIR%\" mkdir "%BACKUP_FILES_DIR%"

REM ============================================================
REM 7. GET TIMESTAMP
REM ============================================================

set "LOCAL_DT="

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do (
    if not defined LOCAL_DT set "LOCAL_DT=%%I"
)

REM WMIC co the bi xoa tren Windows moi
REM Neu WMIC khong co thi dung PowerShell

if not defined LOCAL_DT (
    for /f %%I in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMddHHmmss')"') do (
        set "LOCAL_DT=%%I"
    )
)

if not defined LOCAL_DT (
    echo.
    echo [LOI] Khong lay duoc thoi gian he thong.
    echo.
    exit /b 1
)

set "YYYY=%LOCAL_DT:~0,4%"
set "MO=%LOCAL_DT:~4,2%"
set "DD=%LOCAL_DT:~6,2%"
set "HH=%LOCAL_DT:~8,2%"
set "MI=%LOCAL_DT:~10,2%"
set "SS=%LOCAL_DT:~12,2%"

set "STAMP=%YYYY%%MO%%DD%_%HH%%MI%%SS%"

REM ============================================================
REM 8. BACKUP PATH
REM ============================================================

set "BACKUP_BAK=%BACKUP_DB_DIR%\%DB_NAME%_%STAMP%.bak"
set "BACKUP_FILES=%BACKUP_FILES_DIR%\%STAMP%"

REM ============================================================
REM 9. HEADER
REM ============================================================

echo.
echo ============================================================
echo BACKUP TOAN BO - %DD%/%MO%/%YYYY% %HH%:%MI%:%SS%
echo ============================================================
echo Project : %APP_DIR%
echo Backup  : %BACKUP_ROOT%
echo.
echo Database:
echo   Server   : %SQL_SERVER%
echo   Database : %DB_NAME%
echo   User     : %DB_USER%
echo.
echo Timestamp:
echo   %STAMP%
echo.

>>"%LOG_FILE%" echo.
>>"%LOG_FILE%" echo ============================================================
>>"%LOG_FILE%" echo BACKUP START - %DD%/%MO%/%YYYY% %HH%:%MI%:%SS%
>>"%LOG_FILE%" echo Project  : %APP_DIR%
>>"%LOG_FILE%" echo Database : %DB_NAME%
>>"%LOG_FILE%" echo Server   : %SQL_SERVER%
>>"%LOG_FILE%" echo Files    : %BACKUP_FILES%

REM ============================================================
REM 10. CHECK SQLCMD
REM ============================================================

where sqlcmd >nul 2>&1

if errorlevel 1 (
    echo.
    echo ============================================================
    echo [LOI] KHONG TIM THAY SQLCMD
    echo ============================================================
    echo.
    echo Hay cai SQL Server Command Line Utilities.
    echo.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Khong tim thay sqlcmd.
    exit /b 1
)

REM ============================================================
REM 11. CREATE SQL FILE
REM ============================================================

set "BACKUP_SQL=%TEMP%\QLQD_backup_%RANDOM%_%RANDOM%.sql"

(
    echo BACKUP DATABASE [%DB_NAME%]
    echo TO DISK = N'%BACKUP_BAK%'
    echo WITH INIT, STATS = 10;
) > "%BACKUP_SQL%"

REM ============================================================
REM 12. DATABASE BACKUP
REM
REM QUAN TRONG:
REM -C nam tren CUNG MOT DONG voi sqlcmd
REM Khong dung ^ de tranh loi CMD
REM ============================================================

echo [1/2] Dang backup database...
echo.

if "%DB_USER%"=="" (

    sqlcmd -S "%SQL_SERVER%" -E -C -b -i "%BACKUP_SQL%"

) else (

    sqlcmd -S "%SQL_SERVER%" -U "%DB_USER%" -P "%DB_PASSWORD%" -C -b -i "%BACKUP_SQL%"

)

set "DB_RC=%ERRORLEVEL%"

del "%BACKUP_SQL%" >nul 2>&1

REM ============================================================
REM 13. CHECK DATABASE RESULT
REM ============================================================

if not "%DB_RC%"=="0" (
    echo.
    echo [LOI] Backup Database THAT BAI.
    echo       Exit code: %DB_RC%
    echo.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Database backup failed - ExitCode=%DB_RC%
    exit /b 1
)

if not exist "%BACKUP_BAK%" (
    echo.
    echo [LOI] SQL Server bao thanh cong nhung KHONG TIM THAY file:
    echo       %BACKUP_BAK%
    echo.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing database backup: %BACKUP_BAK%
    exit /b 1
)

REM ============================================================
REM 14. DATABASE SUCCESS
REM ============================================================

echo.
echo [OK] Database backup:
echo      %BACKUP_BAK%
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] Database: %BACKUP_BAK%

REM ============================================================
REM 15. FILE BACKUP
REM ============================================================

echo [2/2] Dang backup Avatar + Tai lieu...
echo.

call "%APP_DIR%\scripts\backup\backup-files.bat" "%STAMP%"

set "FILES_RC=%ERRORLEVEL%"

REM ============================================================
REM 16. CHECK FILE BACKUP
REM ============================================================

if not "%FILES_RC%"=="0" (
    echo.
    echo [LOI] Backup Files THAT BAI.
    echo       Exit code: %FILES_RC%
    echo.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Files backup failed - ExitCode=%FILES_RC%
    exit /b 1
)

if not exist "%BACKUP_FILES%\" (
    echo.
    echo [LOI] Khong tim thay thu muc backup files:
    echo       %BACKUP_FILES%
    echo.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing files directory: %BACKUP_FILES%
    exit /b 1
)

REM ============================================================
REM 17. FINAL SUCCESS
REM ============================================================

echo.
echo ============================================================
echo [OK] BACKUP TOAN BO HOAN TAT
echo ============================================================
echo Database:
echo %BACKUP_BAK%
echo.
echo Files:
echo %BACKUP_FILES%
echo.
echo Log:
echo %LOG_FILE%
echo ============================================================

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] BACKUP TOAN BO HOAN TAT
>>"%LOG_FILE%" echo Database: %BACKUP_BAK%
>>"%LOG_FILE%" echo Files: %BACKUP_FILES%
>>"%LOG_FILE%" echo ============================================================

exit /b 0