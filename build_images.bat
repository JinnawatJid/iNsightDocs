@echo off
echo Checking Docker Environment...

FOR /F "tokens=*" %%g IN ('docker version --format "{{.Server.Os}}"') do (SET DOCKER_OS=%%g)

IF /I "%DOCKER_OS%" NEQ "windows" (
    echo.
    echo [ERROR] Docker is currently running in Linux mode (%DOCKER_OS%).
    echo         This build requires Native Windows Containers.
    echo.
    echo         Please switch Docker Desktop to Windows Containers mode:
    echo         1. Right-click the Docker icon in the system tray.
    echo         2. Select "Switch to Windows containers...".
    echo.
    exit /b 1
)

echo Docker is running in Windows mode. Proceeding...
echo Building Windows Docker Images...

docker build -f Dockerfile.backend.windows -t credit-request-backend ./backend
if %errorlevel% neq 0 exit /b %errorlevel%

docker build -f Dockerfile.frontend.windows -t credit-request-frontend .
if %errorlevel% neq 0 exit /b %errorlevel%

echo Build Complete.
