@echo off
setlocal
cd /d "%~dp0"

echo.
echo Property Suite deployment validation
echo Source: %CD%
echo.
echo This runs tests and a production build without changing C:\PropertySuite.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deployment\Deploy-PropertySuite.ps1" -WorkspaceRoot "%CD%" -ValidateOnly
set EXITCODE=%ERRORLEVEL%

echo.
if %EXITCODE% EQU 0 (
  echo Validation passed.
) else (
  echo Validation failed with exit code %EXITCODE%.
)
echo.
pause
exit /b %EXITCODE%
