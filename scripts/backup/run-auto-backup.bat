@echo off
setlocal EnableExtensions

REM ============================================================
REM AUTO BACKUP
REM ============================================================

set "APP_DIR=C:\QLQD-CUONG\qlqdtvc1 - 3006"
set "BACKUP_SCRIPT=%APP_DIR%\scripts\backup\backup-all.bat"
set "LOG_DIR=D:\QuanLyQuanLuc_Backups\Logs"
set "LOG_FILE=%LOG_DIR%\auto-backup.log"

REM ============================================================
REM 1. TAO LOG DIRECTORY
REM ============================================================

if not exist "%LOG_DIR%\" mkdir "%LOG_DIR%"

REM ============================================================
REM 2. KIEM TRA BACKUP SCRIPT
REM ============================================================

if not exist "%BACKUP_SCRIPT%" (
    >>"%LOG_FILE%" echo.
    >>"%LOG_FILE%" echo ============================================================
    >>"%LOG_FILE%" echo AUTO BACKUP START: %DATE% %TIME%
    >>"%LOG_FILE%" echo ============================================================
    >>"%LOG_FILE%" echo [LOI] Khong tim thay backup-all.bat
    >>"%LOG_FILE%" echo SCRIPT: %BACKUP_SCRIPT%
    exit /b 1
)

REM ============================================================
REM 3. GHI LOG BAT DAU
REM ============================================================

>>"%LOG_FILE%" echo.
>>"%LOG_FILE%" echo ============================================================
>>"%LOG_FILE%" echo AUTO BACKUP START: %DATE% %TIME%
>>"%LOG_FILE%" echo APP_DIR: %APP_DIR%
>>"%LOG_FILE%" echo SCRIPT : %BACKUP_SCRIPT%
>>"%LOG_FILE%" echo ============================================================

REM ============================================================
REM 4. CHAY BACKUP
REM ============================================================

pushd "%APP_DIR%"

call "%BACKUP_SCRIPT%" >>"%LOG_FILE%" 2>&1

set "RC=%ERRORLEVEL%"

popd

REM ============================================================
REM 5. GHI KET QUA
REM ============================================================

>>"%LOG_FILE%" echo AUTO BACKUP END: %DATE% %TIME% - EXIT CODE=%RC%

if "%RC%"=="0" (
    >>"%LOG_FILE%" echo [OK] AUTO BACKUP THANH CONG
) else (
    >>"%LOG_FILE%" echo [LOI] AUTO BACKUP THAT BAI
)

exit /b %RC%