@echo off
echo ========================================
echo Multi-Database API Service
echo Starting Development Environment
echo ========================================
echo.

REM Check if node_modules exist in backend
if not exist "backend\node_modules" (
    echo [ERROR] Backend dependencies not installed!
    echo Please run: cd backend ^&^& npm install
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exist in frontend
if not exist "frontend\node_modules" (
    echo [WARNING] Frontend dependencies not installed!
    echo Please run: cd frontend ^&^& npm install
    echo.
)

echo Starting Backend Server...
cd backend
start "Backend API" cmd /k "npm run dev"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend Development Server...
cd ..\frontend
start "Frontend UI" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo Backend API: http://localhost:3000
echo Frontend UI: http://localhost:5173
echo.
echo Press any key to close this window...
echo (Services will continue running in separate windows)
pause > nul
