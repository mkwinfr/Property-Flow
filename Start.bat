@echo off
setlocal enabledelayedexpansion
REM Property Suite Development Environment Launcher
REM Prerequisites: Node.js, npm, Windows Terminal

cls
echo.
echo =====================================================
echo  Property Suite Dev Environment - All Servers
echo =====================================================
echo.

:: Determine script location for portable paths
set SCRIPT_DIR=%~dp0
if not "!SCRIPT_DIR:~-1!"=="\" set SCRIPT_DIR=!SCRIPT_DIR!\
set BACKEND_DIR=!SCRIPT_DIR!Property Flow Backend
set DESKTOP_DIR=!SCRIPT_DIR!Property Flow Desktop
set TECH_DIR=!SCRIPT_DIR!Property Flow Tech

:: Verify directories exist
if not exist "!BACKEND_DIR!" (
    echo ERROR: Backend directory not found
    echo Expected: "!BACKEND_DIR!"
    pause
    exit /b 1
)
if not exist "!DESKTOP_DIR!" (
    echo ERROR: Desktop directory not found
    echo Expected: "!DESKTOP_DIR!"
    pause
    exit /b 1
)
if not exist "!TECH_DIR!" (
    echo ERROR: Tech directory not found
    echo Expected: "!TECH_DIR!"
    pause
    exit /b 1
)

echo Launching all three servers in Windows Terminal...
echo.
echo Paths being used:
echo   Backend:  !BACKEND_DIR!
echo   Desktop:  !DESKTOP_DIR!
echo   Tech:     !TECH_DIR!
echo.
echo [1] BACKEND   - Port 4000 (REST API)
echo [2] DESKTOP   - Development server
echo [3] TECH      - Development server
echo [4] CLOUDFLARE - Tunnel (property-suite-laptop)
echo.
echo All servers will launch in separate tabs.
echo.

REM Launch Windows Terminal with four tabs for better readability
wt --size 120x40 new-tab --title "Backend (Port 4000)" -d "!BACKEND_DIR!" cmd /k "npm run dev"; new-tab --title "Desktop" -d "!DESKTOP_DIR!" cmd /k "npm run dev -- --host"; new-tab --title "Tech" -d "!TECH_DIR!" cmd /k "npm run dev -- --host"; new-tab --title "Cloudflare Tunnel" cmd /k "cloudflared tunnel run property-suite-laptop"

echo.
echo Windows Terminal opened with four separate tabs.
echo Please wait for all servers to start...
echo.
timeout /t 3 /nobreak