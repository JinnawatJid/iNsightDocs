@echo off
setlocal

echo ===================================================
echo [BOOTSTRAP] Checking Environment...
echo ===================================================

:: Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js to run this builder.
    exit /b 1
)

echo ===================================================
echo [BOOTSTRAP] Installing Build Dependencies...
echo ===================================================
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install build dependencies.
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [BOOTSTRAP] Launching Release Builder...
echo ===================================================
node scripts/build-release.js

endlocal
pause
