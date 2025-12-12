@echo off
REM Property Suite Development Environment Launcher
REM Prerequisites: Node.js, npm, Windows Terminal
REM Usage: Run this script from the workspace root

setlocal enabledelayedexpansion

echo.
echo ===================================
echo  Property Suite Dev Environment
echo ===================================
echo.

:: Determine script location for portable paths
set SCRIPT_DIR=%~dp0
set BACKEND_DIR=!SCRIPT_DIR!Property Flow Backend
set FRONTEND_DIR=!SCRIPT_DIR!Property Flow Tech

:: Verify directories exist
if not exist "!BACKEND_DIR!" (
    echo ERROR: Backend directory not found at !BACKEND_DIR!
    pause
    exit /b 1
)
if not exist "!FRONTEND_DIR!" (
    echo ERROR: Frontend directory not found at !FRONTEND_DIR!
    pause
    exit /b 1
)

echo Starting Property Suite...
echo - Backend: !BACKEND_DIR!
echo - Frontend: !FRONTEND_DIR!
echo.

wt -w 0 new-tab cmd /k "cd /d !BACKEND_DIR! && title Backend - Property Suite && npm run dev" ; split-pane -V cmd /k "cd /d !FRONTEND_DIR! && title Frontend - Property Suite && npm run dev -- --host"

echo Development environment launched in Windows Terminal.
pause