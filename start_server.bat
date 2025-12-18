@echo off
setlocal

rem ===================================================
rem CONFIGURATION
rem ===================================================
set PORT=3000
rem set DB_SERVER=localhost
rem set DB_USER=sa
rem set DB_PASS=yourPassword
rem ===================================================

echo Starting Application on Port %PORT%...

rem Add the local bundled Node.js to the PATH
set "SCRIPT_DIR=%~dp0"
set "NODE_PATH=%SCRIPT_DIR%node"
set "PATH=%NODE_PATH%;%PATH%"

rem Verify Node access
node --version
if %errorlevel% neq 0 (
    echo [ERROR] Could not find bundled Node.js in "%NODE_PATH%"
    pause
    exit /b 1
)

rem Navigate to the root of the release folder (where backend and dist represent the structure)
cd /d "%SCRIPT_DIR%"

echo Starting Backend Server...
node backend/server.js

pause
