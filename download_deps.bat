@echo off
echo ===================================================
echo [ONLINE] Downloading Dependencies for Offline Build
echo ===================================================

if not exist "offline_deps" mkdir offline_deps

echo.
echo 1. Downloading Node.js v18.19.0 (Windows x64)...
curl -L -o offline_deps/nodejs.zip https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Node.js. Check internet connection.
    exit /b 1
)

echo.
echo 2. Pulling Windows Server Core 2019 Base Image...
echo    (This may take a while depending on your internet speed)
docker pull mcr.microsoft.com/windows/servercore:ltsc2019
if %errorlevel% neq 0 (
    echo [ERROR] Failed to pull Docker image. Ensure Docker is running.
    echo NOTE: If you are on Windows Home, you might not be able to pull this specific Windows image.
    echo       If this fails, you might need to skip this step and pull 'servercore:ltsc2019'
    echo       on a machine that supports Windows Containers, OR relying on the server having internet access
    echo       just for the base image.
    echo.
    echo       Attempting to continue without the base image export...
) else (
    echo.
    echo 3. Saving Base Image to TAR...
    docker save -o offline_deps/base-servercore.tar mcr.microsoft.com/windows/servercore:ltsc2019
)

echo.
echo ===================================================
echo Download Complete. Check the 'offline_deps' folder.
echo ===================================================
pause
