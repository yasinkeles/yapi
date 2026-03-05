@echo off
for /f "tokens=4 delims= " %%i in ('route print ^| findstr 0.0.0.0 ^| findstr /V "0.0.0.0.*0.0.0.0"') do set localIp=%%i

echo +----------------------------------------------------------------+
echo :                    Yapi Dev Starter                            :
echo :                    by YASIN KELES (Yapi)                       :
echo +----------------------------------------------------------------+
echo.
echo Yerel Ag IP Adresiniz: %localIp%
echo.

echo [1/2] Starting Backend...
start cmd /k "cd backend && npm run dev"

echo [2/2] Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo.
echo Cihazlardan erisim icin:
echo Backend: http://%localIp%:3000
echo Frontend: http://%localIp%:5173
echo.
pause