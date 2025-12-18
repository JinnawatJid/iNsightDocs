@echo off
echo ===================================================
echo [ONLINE] Packaging Source for Offline Transfer
echo ===================================================

set PKG_DIR=deployment_package
if exist "%PKG_DIR%" rmdir /s /q "%PKG_DIR%"
mkdir "%PKG_DIR%"

echo.
echo 1. Copying Dependencies...
if exist "offline_deps\nodejs.zip" (
    copy "offline_deps\nodejs.zip" "%PKG_DIR%\"
) else (
    echo [ERROR] offline_deps\nodejs.zip not found! Run download_deps.bat first.
    exit /b 1
)

if exist "offline_deps\base-servercore.tar" (
    copy "offline_deps\base-servercore.tar" "%PKG_DIR%\"
) else (
    echo [WARNING] Base image tar not found. You may need to pull it on the server.
)

echo.
echo 2. Copying Project Files...
rem Using xcopy to exclude node_modules and .git
mkdir "%PKG_DIR%\src"
xcopy /E /I /Y "backend" "%PKG_DIR%\backend" /exclude:exclude_list.txt 2>nul
xcopy /E /I /Y "src" "%PKG_DIR%\src" /exclude:exclude_list.txt 2>nul
xcopy /E /I /Y "public" "%PKG_DIR%\public" /exclude:exclude_list.txt 2>nul
copy "package.json" "%PKG_DIR%\"
copy "package-lock.json" "%PKG_DIR%\"
copy "vite.config.js" "%PKG_DIR%\"
copy "index.html" "%PKG_DIR%\"
copy "static-server.js" "%PKG_DIR%\"
copy "Dockerfile.backend.windows" "%PKG_DIR%\"
copy "Dockerfile.frontend.windows" "%PKG_DIR%\"
copy "docker-compose.windows.yml" "%PKG_DIR%\"
copy ".dockerignore" "%PKG_DIR%\"

echo.
echo 3. Creating Helper Scripts...
copy "build_images.bat" "%PKG_DIR%\"
copy "start_app.bat" "%PKG_DIR%\"
copy "offline_install.bat" "%PKG_DIR%\"

echo.
echo ===================================================
echo Package Created: %PKG_DIR%
echo Copy this folder to your offline server.
echo ===================================================
pause
