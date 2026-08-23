@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM CLEANUP OLD BACKUPS
REM GIU LAI N BACKUP GAN NHAT
REM ============================================================

set "BACKUP_ROOT=C:\QuanLyQuanLuc_Backups"
set "BACKUP_DB_DIR=%BACKUP_ROOT%\Database"
set "BACKUP_FILES_DIR=%BACKUP_ROOT%\Files"
set "LOG_FILE=%BACKUP_ROOT%\backup.log"

set "KEEP=%~1"

if "%KEEP%"=="" set "KEEP=5"

echo.
echo ============================================================
echo CLEANUP BACKUP CU
echo ============================================================
echo Giu lai: %KEEP% ban gan nhat
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [CLEANUP] Start - Keep=%KEEP%

REM ============================================================
REM DATABASE
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$dir='%BACKUP_DB_DIR%'; $keep=%KEEP%; if(Test-Path $dir){ $items=Get-ChildItem -LiteralPath $dir -Filter 'QUANLUC_*.bak' -File | Sort-Object LastWriteTime -Descending; if($items.Count -gt $keep){ $items | Select-Object -Skip $keep | ForEach-Object { Write-Host ('Xoa DB: ' + $_.FullName); Remove-Item -LiteralPath $_.FullName -Force } }}"

if errorlevel 1 (

    echo [LOI] Cleanup Database that bai.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Cleanup Database failed.
    exit /b 1
)

REM ============================================================
REM FILES
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$dir='%BACKUP_FILES_DIR%'; $keep=%KEEP%; if(Test-Path $dir){ $items=Get-ChildItem -LiteralPath $dir -Directory | Where-Object { $_.Name -match '^\d{8}_\d{6}$' } | Sort-Object LastWriteTime -Descending; if($items.Count -gt $keep){ $items | Select-Object -Skip $keep | ForEach-Object { Write-Host ('Xoa Files: ' + $_.FullName); Remove-Item -LiteralPath $_.FullName -Recurse -Force } }}"

if errorlevel 1 (

    echo [LOI] Cleanup Files that bai.
    >>"%LOG_FILE%" echo [%DATE% %TIME%] [LOI] Cleanup Files failed.
    exit /b 1
)

echo.
echo [OK] Cleanup hoan tat.
echo.

>>"%LOG_FILE%" echo [%DATE% %TIME%] [OK] Cleanup completed - Keep=%KEEP%

exit /b 0