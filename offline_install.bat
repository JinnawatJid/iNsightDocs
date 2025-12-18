@echo off
echo ===================================================
echo [OFFLINE] Installing and Building Application
echo ===================================================

echo.
echo 1. Loading Base Image...
if exist "base-servercore.tar" (
    docker load -i base-servercore.tar
) else (
    echo [WARNING] base-servercore.tar not found. Assuming image is already loaded or pullable.
)

echo.
echo 2. Preparing Build Context...
rem The Dockerfiles expect nodejs.zip in the root context.
if not exist "nodejs.zip" (
    echo [ERROR] nodejs.zip is missing! Cannot build.
    pause
    exit /b 1
)

rem We need nodejs.zip in the backend folder too for that build context
copy "nodejs.zip" "backend\"

echo.
echo 3. Building Images...
echo    (This will use the local nodejs.zip)

rem Using the existing build script, but ensuring it uses the local context
call build_images.bat

echo.
echo ===================================================
echo Installation Complete. Run 'start_app.bat' to launch.
echo ===================================================
pause
