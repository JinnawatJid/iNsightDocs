@echo off
echo Starting Application...

docker-compose -f docker-compose.windows.yml up -d
if %errorlevel% neq 0 exit /b %errorlevel%

echo Application started.
