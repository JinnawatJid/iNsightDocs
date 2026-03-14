# Release Process and Automation Guide

This document explains how the automated release builder works under the hood. It is intended for developers and future maintainers who need to understand, troubleshoot, or modify the production deployment pipeline for the air-gapped Windows Server environment.

The entry point for generating a release is `create_release.bat`, which bootstraps the environment and executes the main build script located at `scripts/build-release.js`.

## 1. Prerequisites (Build Machine)
Before running the release builder, the build machine (which must have internet access) requires:
- **Node.js:** Installed and available in the system `PATH`.
- **NPM:** Available to install the build script's own dependencies.

## 2. Bootstrapping (`create_release.bat`)
When a developer double-clicks or runs `create_release.bat`:
1. **Environment Check:** It verifies that `node` is accessible via the command line.
2. **Dependency Installation:** It runs `npm install` in the root directory to ensure the build script's dependencies (e.g., `fs-extra`, `archiver`, `axios`, `cli-progress`) are present.
3. **Execution:** It launches the main Node.js build script (`node scripts/build-release.js`).

## 3. The Build Pipeline (`scripts/build-release.js`)
The `build-release.js` script orchestrates a 9-step automated process to create a fully self-contained deployment artifact:

### Step 1: Cleaning
- Deletes any existing `release/` directory from previous builds to ensure a clean state.
- Re-creates an empty `release/` directory.

### Step 2: Building the Frontend
- Runs `npm install` and `npm run build` in the root directory.
- This compiles the Vue.js frontend application into static assets located in the `dist/` folder.

### Step 3 & 4: Bundling a Standalone Node.js Binary
- **Download:** Downloads a specific, pre-compiled Node.js binary for Windows (`node-v20.10.0-win-x64.zip`) directly from `nodejs.org`. This guarantees the target server runs the correct Node version without manual installation.
- **Extraction:** Extracts the zip file and moves the binaries into `release/node/`.

### Step 5: Copying the Backend
- Copies the entire `backend/` directory into `release/backend/`.
- **Exclusions:** During the copy process, it filters out files and directories listed in `exclude_backend.txt` (e.g., `node_modules`, test files, or development configs) to reduce the final payload size.

### Step 6: Copying the Frontend
- Copies the compiled `dist/` directory into `release/dist/`.

### Step 7: Installing Production Dependencies (Offline Mode)
- Navigates to `release/backend/` and runs `npm install --omit=dev`.
- **Puppeteer Handling:** It explicitly sets the environment variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`. This prevents NPM from attempting to download the massive ~170MB Chromium browser binary, which is critical for saving space and time.
- Immediately after installation, it runs `npm uninstall puppeteer` to further clean up the module. *(Note: If the air-gapped server requires Puppeteer functionality, the Chromium binary must be transferred manually outside this build process).*

### Step 8: Configuring the Production Environment
- **Directories:** Ensures `uploads/` and `downloads/` directories exist within `release/backend/`.
- **.env Template:** Generates a template `.env` file populated with default production database connection strings (e.g., `DB_SERVER=localhost`, `DB_NAME=CreditRequestDB`). Maintainers must update this file on the target server.
- **Startup Script:** Generates `disable_quickedit.ps1` and `start_server.bat`, which are placed in the root of the release. The batch script:
  1. Sets a custom title for the active terminal window (`Credit Request System Backend Server`) for easy identification.
  2. Executes the `disable_quickedit.ps1` PowerShell script using the C# `SetConsoleMode` API to dynamically disable Windows QuickEdit Mode for the active console. This prevents the Node.js process from freezing indefinitely when a user accidentally clicks inside the terminal.
  3. Temporarily adds the bundled `release/node/` binary to the system `PATH`.
  4. Navigates to the backend directory.
  5. Starts the main Node.js backend server.

### Step 9: Zipping the Artifact
- Uses the `archiver` library to compress the entire `release/` directory into a single `release.zip` file located in the project root.
- It uses a moderate compression level (level 5) to balance build speed and final file size.

## 4. Output Artifact
The final output is a single `release.zip` file containing:
```text
release.zip
├── backend/                (Source code + prod node_modules)
├── dist/                   (Compiled Vue frontend)
├── node/                   (Standalone Windows Node.js binaries)
├── disable_quickedit.ps1   (PowerShell script to prevent console freezing)
├── start_server.bat        (Entry point script)
└── .env                    (Template environment configuration)
```
This artifact is entirely self-contained and is what developers will transfer to the air-gapped production Windows Server.

## 5. Modifying the Build Process
If you need to change how releases are built:
- **Change Node Version:** Update the `NODE_VERSION` constant at the top of `scripts/build-release.js`.
- **Exclude Files:** Add file or folder names to `exclude_backend.txt` to prevent them from being copied into the final backend folder.
- **Modify Startup Logic:** Edit the `batContent` string within Step 8 of `scripts/build-release.js` to change how the server boots (e.g., changing ports or startup flags).