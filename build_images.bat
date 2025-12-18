@echo off
echo Building Windows Docker Images...

docker build -f Dockerfile.backend.windows -t credit-request-backend ./backend
if %errorlevel% neq 0 exit /b %errorlevel%

docker build -f Dockerfile.frontend.windows -t credit-request-frontend .
if %errorlevel% neq 0 exit /b %errorlevel%

echo Build Complete.
