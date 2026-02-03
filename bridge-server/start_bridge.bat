@echo off
setlocal
chcp 65001 >nul

echo =========================================================
echo      ระบบเชื่อมต่อข้อมูล DBD (DBD Bridge Server)
echo =========================================================

:: Configuration
set "NODE_VERSION=v20.11.0"
set "NODE_DIST=node-%NODE_VERSION%-win-x64"
set "NODE_URL=https://nodejs.org/dist/%NODE_VERSION%/%NODE_DIST%.zip"
set "LOCAL_NODE_DIR=%~dp0node_bin"

:: 1. Check for Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] ตรวจพบ Node.js ในเครื่องแล้ว (Found Node.js^)
    goto :INSTALL_DEPS
)

:: Check for Local Node.js
if exist "%LOCAL_NODE_DIR%\node.exe" (
    echo [INFO] ใช้ Node.js แบบพกพา (Using Portable Node.js^)
    set "PATH=%LOCAL_NODE_DIR%;%PATH%"
    goto :INSTALL_DEPS
)

:: 2. Download Node.js if missing
echo [INFO] ไม่พบโปรแกรม Node.js กำลังดาวน์โหลดอัตโนมัติ...
echo        (Downloading Node.js portable version...)
echo.

if not exist "%~dp0temp_node.zip" (
    powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%~dp0temp_node.zip'"
    if %errorlevel% neq 0 (
        echo [ERROR] ดาวน์โหลดไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต
        pause
        exit /b 1
    )
)

echo [INFO] กำลังแตกไฟล์ระบบ... (Extracting...)
powershell -Command "Expand-Archive -Path '%~dp0temp_node.zip' -DestinationPath '%~dp0temp_extract' -Force"

echo [INFO] กำลังตั้งค่าระบบ... (Configuring...)
move "%~dp0temp_extract\%NODE_DIST%" "%LOCAL_NODE_DIR%" >nul
rmdir "%~dp0temp_extract" /s /q
del "%~dp0temp_node.zip"

set "PATH=%LOCAL_NODE_DIR%;%PATH%"

:INSTALL_DEPS
echo.
echo [INFO] ตรวจสอบความพร้อมของระบบ... (Checking dependencies)
if not exist "%~dp0node_modules" (
    echo [INFO] กำลังติดตั้งส่วนเสริม (ครั้งแรกอาจใช้เวลานาน 1-2 นาที)...
    echo        - Installing dependencies, please wait...
    call npm install --omit=dev --no-audit --no-fund --loglevel=error
)

echo.
echo =========================================================
echo      พร้อมใช้งาน! กรุณาอย่าปิดหน้าต่างนี้
echo      (Ready! Do not close this window)
echo =========================================================
echo.

:: 3. Start Server
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] เกิดข้อผิดพลาดในการทำงาน
    pause
)
