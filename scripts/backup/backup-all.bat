@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM QUAN LY QUAN LUC - BACKUP ALL
REM Database + Files
REM
REM PORTABLE:
REM APP_DIR duoc tinh tu vi tri scripts\backup
REM Khong hard-code duong dan project
REM
REM RETENTION:
REM Chi giu 5 bo backup gan nhat
REM ============================================================

REM ============================================================
REM 1. XAC DINH THU MUC PROJECT
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%..\.."

REM Chuan hoa APP_DIR
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

REM ============================================================
REM 2. BACKUP CONFIG
REM ============================================================

set "BACKUP_ROOT=C:\QuanLyQuanLuc_Backups"

set "BACKUP_DB_DIR=%BACKUP_ROOT%\Database"
set "BACKUP_FILES_DIR=%BACKUP_ROOT%\Files"
set "LOG_FILE=%BACKUP_ROOT%\backup.log"

REM ============================================================
REM SO BAN BACKUP MUON GIU LAI
REM ============================================================

set "RETENTION_COUNT=5"

REM ============================================================
REM 3. DATABASE CONFIG
REM ============================================================

set "DB_SERVER=localhost"
set "DB_PORT=1433"
set "DB_NAME=QUANLUC"
set "DB_USER=quanluc"
set "DB_PASSWORD="

REM ============================================================
REM 4. DOC .env.local
REM ============================================================

if exist "%APP_DIR%\.env.local" (

    for /f "usebackq tokens=1,* delims==" %%A in ("%APP_DIR%\.env.local") do (

        if "%%A"=="DB_SERVER" set "DB_SERVER=%%B"
        if "%%A"=="DB_PORT" set "DB_PORT=%%B"
        if "%%A"=="DB_NAME" set "DB_NAME=%%B"
        if "%%A"=="DB_USER" set "DB_USER=%%B"
        if "%%A"=="DB_PASSWORD" set "DB_PASSWORD=%%B"

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
    echo %APP_DIR%
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

for /f "tokens=2 delims==" %%I in (
    'wmic os get localdatetime /value 2^>nul'
) do (
    if not defined LOCAL_DT set "LOCAL_DT=%%I"
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
echo Retention:
echo   Giu %RETENTION_COUNT% ban gan nhat
echo.

>>"%LOG_FILE%" echo.
>>"%LOG_FILE%" echo ============================================================
>>"%LOG_FILE%" echo BACKUP START - %DD%/%MO%/%YYYY% %HH%:%MI%:%SS%
>>"%LOG_FILE%" echo Project  : %APP_DIR%
>>"%LOG_FILE%" echo Database : %DB_NAME%
>>"%LOG_FILE%" echo Server   : %SQL_SERVER%
>>"%LOG_FILE%" echo Timestamp: %STAMP%

REM ============================================================
REM 10. CHECK SQLCMD
REM ============================================================

where sqlcmd >nul 2>&1

if errorlevel 1 (

    echo.
    echo [LOI] Khong tim thay sqlcmd trong PATH.
    echo Hay cai Microsoft SQL Server Command Line Utilities.
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Khong tim thay sqlcmd.

    exit /b 1
)

REM ============================================================
REM 11. BACKUP DATABASE
REM ============================================================

echo [1/2] Dang backup database...
echo.

set "BACKUP_SQL=%TEMP%\QLQD_backup_%RANDOM%_%RANDOM%.sql"

(
    echo BACKUP DATABASE [%DB_NAME%]
    echo TO DISK = N'%BACKUP_BAK%'
    echo WITH INIT, STATS = 10;
) > "%BACKUP_SQL%"

REM ============================================================
REM SQLCMD
REM
REM KHONG DUNG -C
REM De tranh loi voi sqlcmd/ODBC cu
REM ============================================================

if "%DB_USER%"=="" (

    sqlcmd ^
        -S "%SQL_SERVER%" ^
        -E ^
        -N ^
        -C ^
        -i "%BACKUP_SQL%" ^
        -b

) else (

    sqlcmd ^
        -S "%SQL_SERVER%" ^
        -U "%DB_USER%" ^
        -P "%DB_PASSWORD%" ^
        -N ^
        -C ^
        -i "%BACKUP_SQL%" ^
        -b

)
set "DB_RC=%ERRORLEVEL%"

del "%BACKUP_SQL%" >nul 2>&1

REM ============================================================
REM CHECK DATABASE
REM ============================================================

if not "%DB_RC%"=="0" (

    echo.
    echo [LOI] Backup Database THAT BAI.
    echo Exit code: %DB_RC%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Database backup failed - ExitCode=%DB_RC%

    exit /b 1
)

if not exist "%BACKUP_BAK%" (

    echo.
    echo [LOI] SQL Server bao thanh cong nhung KHONG TIM THAY FILE:
    echo %BACKUP_BAK%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing database backup: %BACKUP_BAK%

    exit /b 1
)

echo.
echo [OK] Database backup:
echo      %BACKUP_BAK%
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] Database: %BACKUP_BAK%

REM ============================================================
REM 12. BACKUP FILES
REM ============================================================

echo [2/2] Dang backup Avatar + Tai lieu...
echo.

call "%SCRIPT_DIR%backup-files.bat" "%STAMP%"

set "FILES_RC=%ERRORLEVEL%"

if not "%FILES_RC%"=="0" (

    echo.
    echo [LOI] Backup Files THAT BAI.
    echo Exit code: %FILES_RC%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Files backup failed - ExitCode=%FILES_RC%

    exit /b 1
)

if not exist "%BACKUP_FILES%\" (

    echo.
    echo [LOI] Khong tim thay thu muc backup:
    echo %BACKUP_FILES%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing files backup: %BACKUP_FILES%

    exit /b 1
)

REM ============================================================
REM 13. CHI DON BACKUP CU SAU KHI BACKUP THANH CONG
REM ============================================================

echo.
echo ============================================================
echo DANG DON BACKUP CU
echo ============================================================
echo Giu lai %RETENTION_COUNT% ban gan nhat
echo.

call "%SCRIPT_DIR%cleanup-backups.bat" "%RETENTION_COUNT%"

set "CLEANUP_RC=%ERRORLEVEL%"

if not "%CLEANUP_RC%"=="0" (

    echo.
    echo [CANH BAO] Backup da thanh cong.
    echo Nhung don backup cu that bai.
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [CANH BAO] Cleanup failed - ExitCode=%CLEANUP_RC%

) else (

    echo.
    echo [OK] Don backup cu thanh cong.
    echo.

)

REM ============================================================
REM 14. FINAL SUCCESS
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
echo.
echo Retention:
echo Giu %RETENTION_COUNT% ban gan nhat
echo ============================================================

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] BACKUP TOAN BO HOAN TAT
>>"%LOG_FILE%" echo Database: %BACKUP_BAK%
>>"%LOG_FILE%" echo Files: %BACKUP_FILES%
>>"%LOG_FILE%" echo Retention: %RETENTION_COUNT%
>>"%LOG_FILE%" echo ============================================================

exit /b 0