@echo off
echo Saving Docker Images to TAR files...

docker save -o credit-request-backend.tar credit-request-backend
if %errorlevel% neq 0 exit /b %errorlevel%

docker save -o credit-request-frontend.tar credit-request-frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo Images saved successfully.
