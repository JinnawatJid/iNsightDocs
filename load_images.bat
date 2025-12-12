@echo off
echo ========================================================
echo Credit Request System - Docker Image Loader
echo ========================================================
echo.

if not exist credit-request-backend.tar (
    echo Error: credit-request-backend.tar not found!
    pause
    exit /b 1
)

if not exist credit-request-frontend.tar (
    echo Error: credit-request-frontend.tar not found!
    pause
    exit /b 1
)

echo 1. Loading Backend Image...
docker load -i credit-request-backend.tar
if %errorlevel% neq 0 (
    echo Error: Failed to load backend image.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Loading Frontend Image...
docker load -i credit-request-frontend.tar
if %errorlevel% neq 0 (
    echo Error: Failed to load frontend image.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo SUCCESS! Images loaded.
echo You can now run 'docker-compose up -d' to start the system.
echo Make sure you have configured your .env file!
echo ========================================================
pause
