@echo off
TITLE Server Prerequisites Assessment

echo Launching Prerequisites Check...
echo.

:: Run the PowerShell script and temporarily bypass the execution policy
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0check_prereqs.ps1'"

echo.
pause
