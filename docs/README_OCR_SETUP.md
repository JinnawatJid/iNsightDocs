# OCR Setup & Usage Guide

This guide explains how to set up and use the new "Smart Import" (OCR) feature for the Credit Request Application.

## 1. Feature Overview
The "Smart Import" feature allows users to upload a Thai National ID Card (JPG/PNG). The system processes the image locally using the Typhoon OCR model and automatically fills the "General Info" and "Residence" tabs of the application form.

## 2. Privacy & Architecture
- **Local Inference:** No data leaves your server. The AI model runs on `localhost`.
- **Mock Mode:** By default, the system runs in "Mock Mode" (returning dummy data) if the AI service is not detected, ensuring the app never crashes.
- **Feature Flag:** The feature is hidden by default to prevent user confusion during testing.

## 3. Installation (Air-Gapped / Offline Server)

Since your server is offline, you must manually transfer the required files.

### Step A: Install Ollama
1. Download the **Ollama Installer** for your OS from [ollama.com](https://ollama.com) on a connected machine.
2. Transfer it to the server and install.
3. Verify it's running by opening a terminal and typing: `ollama --version`.

### Step B: Load the Typhoon Model
1. On a connected machine, pull the model to a file: `ollama pull scb10x/typhoon-ocr1.5-3b`.
2. Save/Export the model (refer to Ollama docs for offline transfer, or copy the `~/.ollama/models` directory).
3. Transfer the model files to the server's `~/.ollama/models` directory.

### Step C: Configure Poppler (For PDF Support)
To support PDF uploads on your Windows Server, the project uses a bundled version of Poppler.

1. Ensure the Poppler binaries (specifically `pdftocairo.exe` and its DLL dependencies) are located in the `backend/poppler/` directory.
2. The system is hardcoded to look for `backend/poppler/pdftocairo.exe`. No System PATH configuration is required.

### Step D: Configure Backend
The backend defaults to looking for Ollama at `http://localhost:11434`.
To disable Mock Mode and use the real AI, ensure your environment variables are set (optional, defaults provided in code):
```
OLLAMA_URL=http://localhost:11434/api/generate
MOCK_OCR=false
```

## 4. How to Test (The "Magic Link")

To verify the feature without disturbing regular users:

1. Open the application in your browser.
2. Add `?feature=ocr_beta` to the URL.
   - Example: `http://server-ip/create-credit-request?feature=ocr_beta`
3. The **"📷 Smart Import (Thai ID)"** button will appear above the Search bar.
4. Click it and upload a test ID card image.

To turn it off, use `?feature=ocr_off` or clear your browser cache (Session Storage).
