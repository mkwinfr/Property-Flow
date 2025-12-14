@echo off
setlocal enabledelayedexpansion
REM Property Suite Development Environment Launcher - ALL SERVICES
REM Prerequisites: Node.js, npm, Windows Terminal, Cloudflared

cls
echo.
echo =====================================================
echo  Property Suite Dev Environment - All Services
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

echo Launching all four services in Windows Terminal...
echo.
echo Paths being used:
echo   Backend:     !BACKEND_DIR!
echo   Desktop:     !DESKTOP_DIR!
echo   Tech:        !TECH_DIR!
echo   Cloudflared: System-wide command
echo.
echo [1] BACKEND      - Port 4000 (REST API)
echo [2] DESKTOP      - Development server
echo [3] TECH         - Development server
echo [4] CLOUDFLARED  - Tunnel service (property-suite-laptop)
echo.
echo All services will appear in horizontal split panes with equal widths.
echo.

REM Launch Windows Terminal with four horizontal split panes (equal size)
REM Using -H for horizontal splits and -s values to create equal widths
wt --size 160x40 new-tab -d "!BACKEND_DIR!" cmd /k "npm run dev"; split-pane -H -s 0.25 -d "!DESKTOP_DIR!" cmd /k "npm run dev -- --host"; split-pane -H -s 0.333 -d "!TECH_DIR!" cmd /k "npm run dev -- --host"; split-pane -H -s 0.5 cmd /k "cloudflared tunnel run property-suite-laptop"

echo.
echo Windows Terminal opened with four equal-width horizontal split panes.
echo Please wait for all services to start...
echo.
timeout /t 3 /nobreak
