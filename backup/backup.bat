@echo off
setlocal enabledelayedexpansion

:: ###############################################################################
:: Yapi - Daily Backup Script (Windows)
:: Author: YASİN KELEŞ (Yapi)
:: ###############################################################################

set "ROOT_DIR=%~dp0.."
set "BACKUP_DIR=%~dp0dailybackup\"
set "DB_FILE=%ROOT_DIR%\backend\data\app.db"
set "TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo +----------------------------------------------------------------+
echo :                    Yapi Backup System                       :
echo :                    by YASIN KELES (Yapi)                      :
echo +----------------------------------------------------------------+

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if not exist "%DB_FILE%" (
    echo [ERROR] Database file not found at: %DB_FILE%
    exit /b 1
)

set "DEST_FILE=%BACKUP_DIR%db_backup_%TIMESTAMP%.sqlite"

echo Copying %DB_FILE% to %DEST_FILE%...
copy /y "%DB_FILE%" "%DEST_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backup created in dailybackup/
    
    :: Optional: Keep only last 30 backups
    echo Cleaning up old backups (keeping last 30)...
    for /f "skip=30 delims=" %%F in ('dir "%BACKUP_DIR%db_backup_*.sqlite" /b /o-d') do (
        echo Deleting old backup: %%F
        del "%BACKUP_DIR%%%F"
    )
) else (
    echo [ERROR] Backup failed!
)

echo --------------------------------------------------
