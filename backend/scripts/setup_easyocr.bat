@echo off
echo Installing EasyOCR and dependencies...
echo Note: This requires Python installed and added to PATH.
echo.

pip install easyocr torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu

echo.
echo EasyOCR installation complete!
pause
