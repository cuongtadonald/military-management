@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM SETUP AUTO BACKUP - QLQD
REM Project: C:\QLQD-CUONG\qlqdtvc1 - 3006
REM Schedule: Ngay 1 hang thang - 02:00
REM Task: QLQD_AutoBackup_Monthly
REM ============================================================

set "APP_DIR=C:\QLQD-CUONG\qlqdtvc1 - 3006"
set "BACKUP_SCRIPT=%APP_DIR%\scripts\backup\backup-all.bat"
set "BACKUP_DIR=C:\QuanLyQuanLuc_Backups"
set "LOG_DIR=%BACKUP_DIR%\Logs"
set "TASK_NAME=QLQD_AutoBackup_Monthly"
set "RUNNER=%APP_DIR%\scripts\backup\run-auto-backup.bat"

echo.
echo ============================================================
echo       CAI DAT AUTO BACKUP QLQD
echo ============================================================
echo Project : %APP_DIR%
echo Script  : %BACKUP_SCRIPT%
echo Backup  : %BACKUP_DIR%
echo Task    : %TASK_NAME%
echo Schedule: Ngay 1 hang thang - 02:00
echo ============================================================
echo.

REM 1. Kiem tra Administrator
net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo [LOI] Hay chuot phai file nay va chon Run as administrator.
    pause
    exit /b 1
)

REM 2. Kiem tra project va script
if not exist "%APP_DIR%\" (
    echo [LOI] Khong tim thay project: %APP_DIR%
    pause
    exit /b 1
)

if not exist "%BACKUP_SCRIPT%" (
    echo [LOI] Khong tim thay: %BACKUP_SCRIPT%
    pause
    exit /b 1
)

REM 3. Tao thu muc backup/log
if not exist "%BACKUP_DIR%\" mkdir "%BACKUP_DIR%"
if not exist "%LOG_DIR%\" mkdir "%LOG_DIR%"

REM 4. Xoa Task cu
echo [1/4] Xoa Task cu neu ton tai...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM 5. Tao runner de Task Scheduler chay dung working directory
echo [2/4] Tao runner auto backup...

> "%RUNNER%" echo @echo off
>> "%RUNNER%" echo chcp 65001 ^>nul
>> "%RUNNER%" echo setlocal EnableExtensions EnableDelayedExpansion
>> "%RUNNER%" echo set "APP_DIR=C:\QLQD-CUONG\qlqdtvc1 - 3006"
>> "%RUNNER%" echo set "BACKUP_SCRIPT=%%APP_DIR%%\scripts\backup\backup-all.bat"
>> "%RUNNER%" echo set "LOG_DIR=C:\QuanLyQuanLuc_Backups\Logs"
>> "%RUNNER%" echo if not exist "%%LOG_DIR%%\" mkdir "%%LOG_DIR%%"
>> "%RUNNER%" echo set "LOG_FILE=%%LOG_DIR%%\auto-backup.log"
>> "%RUNNER%" echo echo. ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo echo ============================================================ ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo echo AUTO BACKUP START: %%DATE%% %%TIME%% ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo echo APP_DIR: %%APP_DIR%% ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo echo SCRIPT : %%BACKUP_SCRIPT%% ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo echo ============================================================ ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo if not exist "%%BACKUP_SCRIPT%%" ^(
>> "%RUNNER%" echo   echo [LOI] Khong tim thay backup-all.bat ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo   exit /b 1
>> "%RUNNER%" echo ^)
>> "%RUNNER%" echo pushd "%%APP_DIR%%"
>> "%RUNNER%" echo call "%%BACKUP_SCRIPT%%" ^>^> "%%LOG_FILE%%" 2^>^&1
>> "%RUNNER%" echo set "RC=%%ERRORLEVEL%%"
>> "%RUNNER%" echo popd
>> "%RUNNER%" echo echo AUTO BACKUP END: %%DATE%% %%TIME%% - EXIT CODE=%%RC%% ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo if "%%RC%%"=="0" echo [OK] AUTO BACKUP THANH CONG ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo if not "%%RC%%"=="0" echo [LOI] AUTO BACKUP THAT BAI ^>^> "%%LOG_FILE%%"
>> "%RUNNER%" echo exit /b %%RC%%

if not exist "%RUNNER%" (
    echo [LOI] Khong tao duoc runner: %RUNNER%
    pause
    exit /b 1
)

REM 6. Tao Task Scheduler: ngay 1 hang thang luc 02:00
echo [3/4] Tao Task Scheduler...

schtasks /create ^
 /tn "%TASK_NAME%" ^
 /tr "cmd.exe /d /c \"\"%RUNNER%\"\"" ^
 /sc monthly ^
 /mo 1 ^
 /d 1 ^
 /st 02:00 ^
 /ru SYSTEM ^
 /rl HIGHEST ^
 /f

if errorlevel 1 (
    echo [LOI] Khong tao duoc Task Scheduler.
    pause
    exit /b 1
)

REM 7. Kiem tra
echo [4/4] Kiem tra Task Scheduler...
schtasks /query /tn "%TASK_NAME%" /fo LIST /v

if errorlevel 1 (
    echo [LOI] Khong doc duoc Task Scheduler vua tao.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo AUTO BACKUP DA DUOC CAI DAT
echo ============================================================
echo Task     : %TASK_NAME%
echo Lich     : Ngay 1 hang thang luc 02:00
echo Script   : %BACKUP_SCRIPT%
echo Runner   : %RUNNER%
echo Backup   : %BACKUP_DIR%
echo Log      : %LOG_DIR%\auto-backup.log
echo.
echo Kiem tra thu cong ngay:
echo   schtasks /run /tn "%TASK_NAME%"
echo.
echo Xem log:
echo   %LOG_DIR%\auto-backup.log
echo ============================================================
echo.

pause
exit /b 0
