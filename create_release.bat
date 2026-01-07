@echo off
setlocal

:: Define variables
set "NODE_VERSION=v20.10.0"
set "NODE_DIST=node-%NODE_VERSION%-win-x64"
set "NODE_URL=https://nodejs.org/dist/%NODE_VERSION%/%NODE_DIST%.zip"
set "RELEASE_DIR=release"
set "BACKEND_DIR=backend"
set "DIST_DIR=dist"

echo ===================================================
echo [1/8] Cleaning previous release...
echo ===================================================
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"

echo ===================================================
echo [2/8] Installing Dependencies ^& Building Frontend...
echo ===================================================
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    exit /b %errorlevel%
)

echo ===================================================
echo [3/8] Downloading Node.js Bundle...
echo ===================================================
powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile 'node.zip'"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Node.js!
    exit /b %errorlevel%
)

echo ===================================================
echo [4/8] Extracting Node.js...
echo ===================================================
powershell -Command "Expand-Archive -Path 'node.zip' -DestinationPath 'temp_node'"
move "temp_node\%NODE_DIST%" "%RELEASE_DIR%\node"
rmdir /s /q "temp_node"
del "node.zip"

echo ===================================================
echo [5/8] Copying Backend...
echo ===================================================
mkdir "%RELEASE_DIR%\backend"
xcopy "%BACKEND_DIR%\*" "%RELEASE_DIR%\backend\" /E /I /Y /exclude:exclude_backend.txt

echo ===================================================
echo [6/8] Copying Frontend Build...
echo ===================================================
mkdir "%RELEASE_DIR%\dist"
xcopy "%DIST_DIR%\*" "%RELEASE_DIR%\dist\" /E /I /Y

echo ===================================================
echo [7/8] Installing Production Dependencies...
echo ===================================================
pushd "%RELEASE_DIR%\backend"
call npm install --omit=dev
popd

echo ===================================================
echo [8/8] Configuring Production Environment...
echo ===================================================

:: Create production .env file
(
echo PORT=3000
echo DB_TYPE=mssql
echo DB_USER=sa
echo DB_PASSWORD=your_password_here
echo DB_SERVER=localhost
echo DB_PORT=1433
echo DB_NAME=CreditRequestDB
) > "%RELEASE_DIR%\backend\.env"

:: Create start_server.bat
(
echo @echo off
echo setlocal
echo.
echo echo ===================================================
echo echo Starting Credit Request System...
echo echo ===================================================
echo.
echo :: Add bundled Node to PATH
echo set "PATH=%%~dp0node;%%PATH%%"
echo.
echo :: Navigate to backend
echo cd backend
echo.
echo :: Start Server
echo node server.js
echo.
echo pause
) > "%RELEASE_DIR%\start_server.bat"

echo ===================================================
echo Release created successfully in "%RELEASE_DIR%" folder!
echo You can zip this folder and deploy it to the target machine.
echo ===================================================
endlocal
pause
