@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM QUAN LY QUAN LUC - BACKUP FILES
REM Portable version
REM ============================================================

REM ============================================================
REM PROJECT PATH
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%..\.."

for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

REM ============================================================
REM BACKUP CONFIG
REM ============================================================

set "BACKUP_ROOT=C:\QuanLyQuanLuc_Backups"
set "BACKUP_FILES_DIR=%BACKUP_ROOT%\Files"
set "LOG_FILE=%BACKUP_ROOT%\backup.log"

REM ============================================================
REM GET TIMESTAMP
REM ============================================================

set "STAMP=%~1"

if "%STAMP%"=="" (

    echo.
    echo [LOI] Khong nhan duoc timestamp.
    echo.

    exit /b 1
)

REM ============================================================
REM SOURCE
REM ============================================================

set "SOURCE_UPLOADS=%APP_DIR%\public\uploads"
set "SOURCE_PUBLIC=%APP_DIR%\public"

REM ============================================================
REM DESTINATION
REM ============================================================

set "BACKUP_DIR=%BACKUP_FILES_DIR%\%STAMP%"
set "BACKUP_UPLOADS=%BACKUP_DIR%\uploads"
set "BACKUP_PUBLIC=%BACKUP_DIR%\public"

REM ============================================================
REM CHECK SOURCE
REM ============================================================

if not exist "%APP_DIR%\" (

    echo.
    echo [LOI] Khong tim thay project:
    echo %APP_DIR%
    echo.

    exit /b 1
)

if not exist "%SOURCE_UPLOADS%\" (

    echo.
    echo [LOI] Khong tim thay:
    echo %SOURCE_UPLOADS%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing uploads.

    exit /b 1
)

if not exist "%SOURCE_PUBLIC%\" (

    echo.
    echo [LOI] Khong tim thay:
    echo %SOURCE_PUBLIC%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Missing public.

    exit /b 1
)

REM ============================================================
REM CREATE DESTINATION
REM ============================================================

if not exist "%BACKUP_DIR%\" mkdir "%BACKUP_DIR%"
if not exist "%BACKUP_UPLOADS%\" mkdir "%BACKUP_UPLOADS%"
if not exist "%BACKUP_PUBLIC%\" mkdir "%BACKUP_PUBLIC%"

REM ============================================================
REM HEADER
REM ============================================================

echo.
echo ============================================================
echo BACKUP FILES
echo ============================================================
echo Source : %SOURCE_UPLOADS%
echo Dest   : %BACKUP_UPLOADS%
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [START] Files backup: %BACKUP_DIR%

REM ============================================================
REM 1. UPLOADS
REM ============================================================

robocopy "%SOURCE_UPLOADS%" "%BACKUP_UPLOADS%" *.* ^
    /E ^
    /DCOPY:DAT ^
    /COPY:DAT ^
    /XJ ^
    /R:2 ^
    /W:2

set "RC_UPLOADS=%ERRORLEVEL%"

if %RC_UPLOADS% GEQ 8 (

    echo.
    echo [LOI] Backup uploads THAT BAI.
    echo Robocopy Exit Code: %RC_UPLOADS%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] uploads failed - Robocopy=%RC_UPLOADS%

    exit /b 1
)

echo.
echo [OK] uploads backup thanh cong.
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] uploads backup - Robocopy=%RC_UPLOADS%

REM ============================================================
REM 2. PUBLIC IMAGES
REM ============================================================

echo.
echo ============================================================
echo BACKUP PUBLIC IMAGES
echo ============================================================
echo Source : %SOURCE_PUBLIC%
echo Dest   : %BACKUP_PUBLIC%
echo.

robocopy "%SOURCE_PUBLIC%" "%BACKUP_PUBLIC%" ^
    *.png ^
    *.jpg ^
    *.jpeg ^
    *.svg ^
    /S ^
    /DCOPY:DAT ^
    /COPY:DAT ^
    /XJ ^
    /R:2 ^
    /W:2

set "RC_PUBLIC=%ERRORLEVEL%"

if %RC_PUBLIC% GEQ 8 (

    echo.
    echo [LOI] Backup public images THAT BAI.
    echo Robocopy Exit Code: %RC_PUBLIC%
    echo.

    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] public images failed - Robocopy=%RC_PUBLIC%

    exit /b 1
)

echo.
echo [OK] Public images backup thanh cong.
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] public images backup - Robocopy=%RC_PUBLIC%

REM ============================================================
REM FINAL CHECK
REM ============================================================

if not exist "%BACKUP_UPLOADS%\" exit /b 1
if not exist "%BACKUP_PUBLIC%\" exit /b 1

REM ============================================================
REM SUCCESS
REM ============================================================

echo.
echo ============================================================
echo BACKUP FILES HOAN TAT
echo ============================================================
echo %BACKUP_DIR%
echo ============================================================

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] FILES BACKUP HOAN TAT: %BACKUP_DIR%

exit /b 0