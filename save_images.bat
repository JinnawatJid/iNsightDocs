@echo off
echo ========================================================
echo Credit Request System - Docker Image Packager
echo ========================================================
echo.

echo 1. Building Docker Images...
docker-compose build
if %errorlevel% neq 0 (
    echo Error: Failed to build images.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Saving Backend Image (credit-request-backend.tar)...
docker save -o credit-request-backend.tar credit-request-backend
if %errorlevel% neq 0 (
    echo Error: Failed to save backend image.
    pause
    exit /b %errorlevel%
)

echo.
echo 3. Saving Frontend Image (credit-request-frontend.tar)...
docker save -o credit-request-frontend.tar credit-request-frontend
if %errorlevel% neq 0 (
    echo Error: Failed to save frontend image.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo SUCCESS!
echo Images saved as 'credit-request-backend.tar' and 'credit-request-frontend.tar'.
echo Please copy these files along with 'docker-compose.yml' and 'load_images.bat' to the target server.
echo ========================================================
pause
