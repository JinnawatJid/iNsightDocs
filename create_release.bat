@echo off
echo ===================================================
echo [ONLINE] Creating Portable Application Bundle
echo ===================================================

set RELEASE_DIR=release
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"

echo.
echo 1. Downloading Node.js v18.19.0 (Windows x64)...
if not exist "nodejs.zip" (
    curl -L -o nodejs.zip https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download Node.js. Check internet.
        exit /b 1
    )
) else (
    echo    (Using existing nodejs.zip)
)

echo.
echo 2. Extracting Node.js...
powershell -Command "Expand-Archive -Path nodejs.zip -DestinationPath %RELEASE_DIR% -Force"
rem Rename the extracted folder (e.g., node-v18.19.0-win-x64) to just 'node'
pushd "%RELEASE_DIR%"
for /d %%d in (node-v*) do move "%%d" "node"
popd

echo.
echo 3. Building Frontend...
rem Install dependencies if needed
if not exist "node_modules" call npm install
rem Build
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b 1
)

echo.
echo 4. Bundling Files...
echo    Copying Backend...
mkdir "%RELEASE_DIR%\backend"
xcopy /E /I /Y "backend" "%RELEASE_DIR%\backend" /exclude:exclude_backend.txt 2>nul

echo    Installing Backend Production Dependencies...
pushd "%RELEASE_DIR%\backend"
rem We assume 'npm' is available globally on the build machine.
rem If not, we could use the local node we just downloaded, but global is safer for build.
call npm install --omit=dev
popd

echo    Copying Frontend (dist)...
mkdir "%RELEASE_DIR%\dist"
xcopy /E /I /Y "dist" "%RELEASE_DIR%\dist" 2>nul

echo.
echo 5. Creating Start Scripts...
copy "start_server.bat" "%RELEASE_DIR%\"

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
