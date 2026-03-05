@echo off
setlocal enabledelayedexpansion

echo +----------------------------------------------------------------+
echo :                    Yapi Export Tool                         :
echo :                    by YASIN KELES (Yapi)                      :
echo +----------------------------------------------------------------+
echo.

:: Generate timestamp (Same as backup.bat)
set "TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo Choose Export Type:
echo [1] Full Data Export (Include your endpoints, users, and settings)
echo [2] Clean Setup (Code only, for fresh installation)
echo.
set /p CHOICE="Enter choice (1 or 2): "

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%"
set "ROOT_DIR=%CD%"
popd
set "EXPORT_DIR=%ROOT_DIR%\exports"
set "TEMP_EXPORT=%TEMP%\Yapi_tmp_%RANDOM%"

if not exist "%EXPORT_DIR%" mkdir "%EXPORT_DIR%"

if "%CHOICE%"=="1" (
    set "EXPORT_TYPE=Full Data"
    set "ZIP_NAME=Yapi-full-backup_%TIMESTAMP%.zip"
    set "EXCLUDE_FILES=.env .git .vscode .idea brain *.zip *.log"
) else (
    set "EXPORT_TYPE=Clean Setup"
    set "ZIP_NAME=Yapi-clean-setup_%TIMESTAMP%.zip"
    set "EXCLUDE_FILES=.env .git .vscode .idea brain *.zip *.log app.db"
)

echo.
echo [1/3] Preparing files for !EXPORT_TYPE!...
echo Root Directory: %ROOT_DIR%
echo Output: %EXPORT_DIR%\%ZIP_NAME%
echo.

if exist "%TEMP_EXPORT%" rd /s /q "%TEMP_EXPORT%" 2>nul
mkdir "%TEMP_EXPORT%"

echo [2/3] Copying files to temporary directory...
robocopy "%ROOT_DIR%" "%TEMP_EXPORT%" /E /R:1 /W:1 /XD node_modules .git logs dist backup exports .vscode .idea brain /XF !EXCLUDE_FILES! /NFL /NDL /NJH /NJS

echo [3/3] Creating zip archive...
:: Using PowerShell with filter to avoid 'nul' device issues
powershell -Command "Get-ChildItem -Path '%TEMP_EXPORT%' | Where-Object { $_.Name -notmatch '^(nul|com\d|lpt\d|con|prn|aux)$' } | Compress-Archive -DestinationPath '%EXPORT_DIR%\%ZIP_NAME%' -Force"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo +----------------------------------------------------------------+
    echo :              !EXPORT_TYPE! Export Successful! v               :
    echo +----------------------------------------------------------------+
    echo.
    echo File created in exports/: %ZIP_NAME%
    echo.
) else (
    echo.
    echo [ERROR] Export failed. Please ensure the target zip is not open in another program.
)

:: Final Cleanup
if exist "%TEMP_EXPORT%" rd /s /q "%TEMP_EXPORT%" 2>nul

echo.
pause
