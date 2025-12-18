@echo off
echo ===================================================
echo [ONLINE] Creating Portable Application Bundle
echo ===================================================

set "RELEASE_DIR=release"

rem Clean previous release
if exist "%RELEASE_DIR%" (
    echo Cleaning previous release...
    rmdir /s /q "%RELEASE_DIR%"
)
mkdir "%RELEASE_DIR%"

echo.
echo 1. Downloading Node.js v18.19.0 (Windows x64)...
if not exist "nodejs.zip" (
    curl -L -o nodejs.zip https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download Node.js. Check internet.
        pause
        exit /b 1
    )
) else (
    echo    (Using existing nodejs.zip)
)

echo.
echo 2. Extracting Node.js...
powershell -Command "Expand-Archive -Path nodejs.zip -DestinationPath '%RELEASE_DIR%' -Force"

rem Rename the extracted folder (e.g., node-v18.19.0-win-x64) to just 'node'
pushd "%RELEASE_DIR%"
set "FOUND_NODE="
for /d %%d in (node-v*) do (
    set "FOUND_NODE=%%d"
    echo    Found extracted folder: %%d
    if exist "node" rmdir /s /q "node"
    move "%%d" "node"
)
popd

rem Verify Node Extraction
if not exist "%RELEASE_DIR%\node\node.exe" (
    echo [ERROR] Node.js extraction failed. "%RELEASE_DIR%\node\node.exe" not found.
    echo Please check if the zip file is valid or if the folder structure changed.
    pause
    exit /b 1
)
echo    Node.js extracted and renamed successfully.

echo.
echo 3. Building Frontend...
rem Install dependencies if needed (using global npm/node of the dev machine)
if not exist "node_modules" (
    echo    Installing frontend dependencies...
    call npm install
)

echo    Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

echo.
echo 4. Bundling Files...
echo    Copying Backend...
mkdir "%RELEASE_DIR%\backend"
xcopy /E /I /Y "backend" "%RELEASE_DIR%\backend" /exclude:exclude_backend.txt >nul

echo    Installing Backend Production Dependencies...
echo    (Using bundled Node.js/npm to ensure compatibility)

rem Temporarily add bundled node to PATH for this session
set "SCRIPT_DIR=%~dp0"
set "BUNDLED_NODE_PATH=%SCRIPT_DIR%%RELEASE_DIR%\node"
set "PATH=%BUNDLED_NODE_PATH%;%PATH%"

rem Verify we are using the bundled node
echo    Debug: checking node version...
call node --version

pushd "%RELEASE_DIR%\backend"
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed for backend.
    popd
    pause
    exit /b 1
)
popd

rem Verify node_modules exists
if not exist "%RELEASE_DIR%\backend\node_modules" (
    echo [ERROR] backend\node_modules is missing!
    pause
    exit /b 1
)

echo    Copying Frontend (dist)...
mkdir "%RELEASE_DIR%\dist"
xcopy /E /I /Y "dist" "%RELEASE_DIR%\dist" >nul

echo.
echo 5. Creating Start Scripts...
copy "start_server.bat" "%RELEASE_DIR%\" >nul

echo.
echo ===================================================
echo Release Created: %RELEASE_DIR%
echo.
echo instructions:
echo 1. Zip the '%RELEASE_DIR%' folder.
echo 2. Transfer to your offline Windows Server.
echo 3. Run 'start_server.bat'.
echo ===================================================
pause
