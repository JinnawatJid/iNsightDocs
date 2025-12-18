@echo off
setlocal
echo ===================================================
echo [ONLINE] Creating Portable Application Bundle v2
echo ===================================================

set RELEASE_DIR=release
set TEMP_EXTRACT=temp_node_extract

echo.
echo [1/6] Cleaning up previous builds...
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
if exist "%TEMP_EXTRACT%" rmdir /s /q "%TEMP_EXTRACT%"
mkdir "%RELEASE_DIR%"

echo.
echo [2/6] Downloading Node.js v18.19.0 (Windows x64)...
if not exist "nodejs.zip" (
    curl -L -o nodejs.zip https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download Node.js. Check internet connection.
        exit /b 1
    )
) else (
    echo    (Using existing nodejs.zip)
)

echo.
echo [3/6] Extracting Node.js...
mkdir "%TEMP_EXTRACT%"
powershell -Command "Expand-Archive -Path nodejs.zip -DestinationPath '%TEMP_EXTRACT%' -Force"

rem Logic: Find the inner folder (e.g., node-v18...) and move it to release/node
cd "%TEMP_EXTRACT%"
set FOUND=0
for /d %%d in (node-v*) do (
    echo    Found extracted folder: %%d
    move "%%d" "..\%RELEASE_DIR%\node"
    set FOUND=1
)
cd ..
rmdir /s /q "%TEMP_EXTRACT%"

if "%FOUND%"=="0" (
    echo [ERROR] Could not find 'node-v*' folder inside the zip. Extraction failed.
    exit /b 1
)
if not exist "%RELEASE_DIR%\node\node.exe" (
    echo [ERROR] node.exe is missing in %RELEASE_DIR%\node.
    exit /b 1
)

echo.
echo [4/6] Building Frontend...
echo    Installing Frontend Dependencies...
if not exist "node_modules" call npm install
echo    Running Build...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b 1
)

echo.
echo [5/6] preparing Backend...
mkdir "%RELEASE_DIR%\backend"
xcopy /E /I /Y "backend" "%RELEASE_DIR%\backend" /exclude:exclude_backend.txt 2>nul

echo    Installing Backend Production Dependencies...
pushd "%RELEASE_DIR%\backend"
rem Ensure we strictly install production deps for the backend
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed for backend.
    popd
    exit /b 1
)

rem Verification
if not exist "node_modules\express" (
    echo [ERROR] 'express' module not found in backend/node_modules after install.
    echo         Please ensure you have internet access or a valid cache.
    popd
    exit /b 1
)
popd

echo.
echo [6/6] Finalizing Bundle...
mkdir "%RELEASE_DIR%\dist"
xcopy /E /I /Y "dist" "%RELEASE_DIR%\dist" 2>nul
copy "start_server.bat" "%RELEASE_DIR%\"

echo.
echo ===================================================
echo SUCCESS! Release created: %RELEASE_DIR%
echo.
echo Instructions:
echo 1. Zip the '%RELEASE_DIR%' folder.
echo 2. Transfer it to your offline server.
echo 3. Run 'start_server.bat'.
echo ===================================================
pause
