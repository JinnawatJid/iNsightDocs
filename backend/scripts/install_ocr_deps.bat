@echo off
echo Installing Node.js dependencies...
cd ..
call npm install tesseract.js
if %errorlevel% neq 0 (
    echo Failed to install tesseract.js
    exit /b %errorlevel%
)

echo Installing Python dependencies (EasyOCR, Torch)...
pip install easyocr torch torchvision torchaudio
if %errorlevel% neq 0 (
    echo Failed to install Python dependencies
    exit /b %errorlevel%
)

echo Installation complete!
pause
