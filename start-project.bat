@echo off
echo ========================================
echo    Starting App Development Server
echo ========================================
echo.

REM Get the directory where this batch file is located
cd /d "%~dp0"

REM Start backend in a new window
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

REM Wait a bit before starting mobile
timeout /t 2 /nobreak >nul

REM Start mobile in a new window
echo Starting Mobile App...
start "Mobile App" cmd /k "cd /d %~dp0mobile && npm start"

echo.
echo ========================================
echo    Both servers are starting...
echo    Backend: http://localhost:3000
echo    Mobile: Expo DevTools
echo ========================================
echo.
echo Press any key to close this window (servers will keep running)...
pause >nul

