@echo off
setlocal
cd /d "%~dp0"

echo.
echo Property Suite deployment
echo Source:  %CD%
echo Target:  C:\PropertySuite
echo.
echo This runs tests, builds the app, backs up production, and restarts the PropertySuite service.
echo Administrator approval is required when prompted.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deployment\Deploy-PropertySuite.ps1" -WorkspaceRoot "%CD%"
set EXITCODE=%ERRORLEVEL%

echo.
if %EXITCODE% EQU 0 (
  echo Deployment finished successfully.
) else (
  echo Deployment failed with exit code %EXITCODE%.
)
echo.
pause
exit /b %EXITCODE%
