@echo off
echo Loading Docker Images from TAR files...

docker load -i credit-request-backend.tar
if %errorlevel% neq 0 exit /b %errorlevel%

docker load -i credit-request-frontend.tar
if %errorlevel% neq 0 exit /b %errorlevel%

echo Images loaded successfully.
