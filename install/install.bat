@echo off
setlocal
chcp 65001 >nul
REM ###############################################################################
REM Yapi - Dependency Installer (Windows)
REM Author: YASIN KELES (Yapi)
REM ###############################################################################

echo +----------------------------------------------------------------+
echo :              Yapi Dependency Installer                        :
echo :              by YASIN KELES (Yapi)                            :
echo +----------------------------------------------------------------+
echo.
echo.
echo This script will ONLY install Node.js dependencies for:
echo    1. Backend Dependencies
echo    2. Frontend Dependencies
echo    3. Env Configuration (.env)
echo    4. Database Initialization
echo.
echo Current directory: %CD%
echo Script location: %~dp0
echo.

REM Move to project root (assuming script is in /install folder)
cd /d "%~dp0\.."
echo Working from root: %CD%
echo.

set /p CONFIRM="Are you sure you want to continue? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo.
    echo Installation cancelled.
    pause
    exit /b 0
)
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    echo Error code: %ERRORLEVEL%
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node -v

REM Check if npm is installed
call npm -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [OK] npm found:
call npm -v
echo.
echo Press any key to start installation...
pause >nul

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.
pause

echo [2/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.
pause

echo [3/4] Setting up backend environment...
cd ..\backend
if exist .env (
    echo [!] Removing existing .env to regenerate...
    del .env
)

echo [!] Creating .env file...
    (
        echo # Server Configuration
        echo NODE_ENV=production
        echo PORT=3000
        echo HOST=0.0.0.0
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS
        echo JWT_ACCESS_EXPIRY=15m
        echo JWT_REFRESH_EXPIRY=7d
        echo REFRESH_TOKEN_SECRET=CHANGE_THIS_TO_ANOTHER_RANDOM_STRING_AT_LEAST_32_CHARS
        echo.
        echo # Encryption
        echo ENCRYPTION_KEY=CHANGE_THIS_TO_A_VERY_LONG_STRING_AT_LEAST_32_CHARS_FOR_ENCRYPTION_KEY
        echo ENCRYPTION_SALT=CHANGE_THIS_TO_A_RANDOM_SALT_AT_LEAST_16_CHARS
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:5173,http://localhost:3000
        echo # Note: Add your server IP ^(e.g., http://192.168.1.x:3000^) to CORS_ORIGIN if accessing remotely
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo # Logging
        echo LOG_LEVEL=info
        echo LOG_FILE_PATH=./logs
        echo.
        echo # Database Connection Pool
        echo DB_POOL_MIN=2
        echo DB_POOL_MAX=10
        echo DB_POOL_IDLE_TIMEOUT=30000
        echo DB_POOL_ACQUIRE_TIMEOUT=30000
    ) > .env
    echo [OK] .env file created
    echo [!] IMPORTANT: Please edit backend\.env later to change secrets.
) else (
    echo [OK] .env file already exists
)
echo.
pause

echo [4/4] Initializing database...
call node src\database\init.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to initialize database
    pause
    exit /b 1
)
echo [OK] Database initialized
echo.

echo +----------------------------------------------------------------+
echo :                Installation Complete!                         :
echo +----------------------------------------------------------------+
echo.
pause
