import fs from 'fs-extra';
import path from 'path';
import { exec, spawn } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import ora from 'ora';
import AdmZip from 'adm-zip';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const NODE_VERSION = 'v20.10.0';
const NODE_DIST = `node-${NODE_VERSION}-win-x64`;
const NODE_URL = `https://nodejs.org/dist/${NODE_VERSION}/${NODE_DIST}.zip`;
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIST_DIR = path.join(ROOT_DIR, 'dist');
const EXCLUDE_FILE = path.join(ROOT_DIR, 'exclude_backend.txt');

// --- Logger Helper ---
class Logger {
  constructor(totalSteps) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
  }

  header() {
    console.log(chalk.cyan('==================================================='));
    console.log(chalk.cyan.bold('           INSIGHTDOCS RELEASE BUILDER'));
    console.log(chalk.cyan('==================================================='));
    console.log('');
  }

  async step(description, action) {
    this.currentStep++;
    const stepPrefix = chalk.gray(`[${this.currentStep}/${this.totalSteps}]`);
    const spinner = ora(`${stepPrefix} ${description}...`).start();

    const startTime = Date.now();

    try {
      await action(spinner);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      spinner.succeed(`${stepPrefix} ${description}... ${chalk.green(`Done (${duration}s)`)}`);
    } catch (error) {
      spinner.fail(`${stepPrefix} ${description}... ${chalk.red('Failed!')}`);
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  log(msg) {
    console.log(msg);
  }
}

// --- Utils ---
const runCommand = (command, cwd = ROOT_DIR) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

const downloadFile = async (url, destPath) => {
  const writer = fs.createWriteStream(destPath);

  const { data, headers } = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  const totalLength = headers['content-length'];

  const progressBar = new cliProgress.SingleBar({
    format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} Bytes | Speed: {speed} | ETA: {eta_formatted}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  progressBar.start(parseInt(totalLength, 10), 0, {
      speed: "0 B/s"
  });

  let downloaded = 0;
  let lastTime = Date.now();
  let lastDownloaded = 0;

  data.on('data', (chunk) => {
    downloaded += chunk.length;

    const now = Date.now();
    // Update speed every 500ms
    if (now - lastTime >= 500) {
        const diff = downloaded - lastDownloaded;
        const timeDiff = (now - lastTime) / 1000;
        const speedBytes = diff / timeDiff;
        let speedStr = "";
        if (speedBytes > 1024 * 1024) {
            speedStr = (speedBytes / (1024 * 1024)).toFixed(1) + " MB/s";
        } else {
            speedStr = (speedBytes / 1024).toFixed(1) + " KB/s";
        }

        progressBar.update(downloaded, { speed: speedStr });
        lastTime = now;
        lastDownloaded = downloaded;
    } else {
        progressBar.update(downloaded);
    }
  });

  data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      progressBar.stop();
      resolve();
    });
    writer.on('error', (err) => {
        progressBar.stop();
        reject(err);
    });
  });
};

// --- Main Script ---
(async () => {
  const logger = new Logger(9);
  logger.header();

  // 1. Clean
  await logger.step('Cleaning previous release', async () => {
    await fs.remove(RELEASE_DIR);
    await fs.ensureDir(RELEASE_DIR);
  });

  // 2. Build Frontend
  await logger.step('Installing dependencies & Building Frontend', async () => {
    // We assume npm install is already run for this script to work,
    // but the release script implies we want a fresh state or valid state.
    // The original script ran `npm install` then `npm run build`.
    await runCommand('npm install', ROOT_DIR);
    await runCommand('npm run build', ROOT_DIR);
  });

  // 3. Download Node
  await logger.step('Downloading Node.js Bundle', async (spinner) => {
    spinner.stop(); // Stop spinner to show progress bar
    console.log(''); // New line for bar
    const zipPath = path.join(ROOT_DIR, 'node.zip');
    await downloadFile(NODE_URL, zipPath);
  });

  // 4. Extract Node
  await logger.step('Extracting Node.js', async () => {
    const zipPath = path.join(ROOT_DIR, 'node.zip');
    const tempNodeDir = path.join(ROOT_DIR, 'temp_node');

    // Use adm-zip for cross-platform extraction
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempNodeDir, true);

    // Move the inner folder to release/node
    const extractedFolder = path.join(tempNodeDir, NODE_DIST);
    const targetFolder = path.join(RELEASE_DIR, 'node');

    await fs.move(extractedFolder, targetFolder);

    // Cleanup
    await fs.remove(tempNodeDir);
    await fs.remove(zipPath);
  });

  // 5. Copy Backend
  await logger.step('Copying Backend', async () => {
    await fs.ensureDir(path.join(RELEASE_DIR, 'backend'));

    // Read exclude list
    let excludes = [];
    try {
      const content = await fs.readFile(EXCLUDE_FILE, 'utf-8');
      excludes = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (e) {
      console.warn('Warning: exclude_backend.txt not found or unreadable.');
    }

    // Filter function
    const filterFunc = (src, dest) => {
      const relativePath = path.relative(BACKEND_DIR, src);
      if (!relativePath) return true; // root folder

      // Check if any exclude pattern matches the start of the relative path
      // Simple matching similar to xcopy / exclude
      for (const pattern of excludes) {
        if (relativePath.includes(pattern)) return false;
        // Also handle cases where pattern is a folder name (e.g., 'node_modules')
        if (relativePath.split(path.sep).includes(pattern)) return false;
      }
      return true;
    };

    await fs.copy(BACKEND_DIR, path.join(RELEASE_DIR, 'backend'), { filter: filterFunc });
  });

  // 6. Copy Frontend
  await logger.step('Copying Frontend Build', async () => {
    await fs.ensureDir(path.join(RELEASE_DIR, 'dist'));
    await fs.copy(FRONTEND_DIST_DIR, path.join(RELEASE_DIR, 'dist'));
  });

  // 7. Install Prod Deps
  await logger.step('Installing Production Dependencies (Excluding Puppeteer)', async () => {
    // Strategy: Install with --omit=dev but SKIP Puppeteer's chromium download via env var.
    // This prevents the 170MB+ download in the first place.
    // Then we uninstall puppeteer to remove the module code.

    // Set env var to skip chromium download
    const installEnv = { ...process.env, PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true' };

    // Run install (skipping binary)
    // Note: We use child_process.exec directly via runCommand wrapper, but need to pass env.
    // Since runCommand helper doesn't support custom env args easily in its current form without modification,
    // we'll modify the command string to set the env var (cross-platform way is tricky in one line).
    // Better: spawn the process with env.

    // Let's modify runCommand usage or just use exec with options if accessible?
    // The current runCommand implementation:
    // const runCommand = (command, cwd = ROOT_DIR) => { ... exec(command, { cwd }, ... ) }
    // It uses standard process.env.

    // Hack: We can just set process.env globally for this script since it's a build script
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

    await runCommand('npm install --omit=dev', path.join(RELEASE_DIR, 'backend'));

    logger.log(chalk.yellow('   Removing Puppeteer module to clean up (Offline Mode)...'));
    await runCommand('npm uninstall puppeteer', path.join(RELEASE_DIR, 'backend'));
  });

  // 8. Configure Environment
  await logger.step('Configuring Production Environment', async () => {
    // Ensure data directories exist
    await fs.ensureDir(path.join(RELEASE_DIR, 'backend', 'downloads'));

    // Create .env
    const envContent = [
      'PORT=3000',
      'DB_TYPE=mssql',
      'DB_USER=sa',
      'DB_PASSWORD=your_password_here',
      'DB_SERVER=localhost',
      'DB_PORT=1433',
      'DB_NAME=CreditRequestDB',
      'UPLOAD_PATH=../../customers',
      'LOG_DIR=../../logs',
      '# Number of days before downloaded DBD financial files are considered expired',
      'DBD_FILE_FRESHNESS_DAYS=180'
    ].join('\n');
    await fs.writeFile(path.join(RELEASE_DIR, 'backend', '.env'), envContent);

    // Create a PowerShell script to safely disable QuickEdit
    const ps1Content = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ConsoleUtility {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);
    [DllImport("kernel32.dll")]
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
    [DllImport("kernel32.dll")]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
    public static void DisableQuickEdit() {
        IntPtr hConsole = GetStdHandle(-10); // STD_INPUT_HANDLE
        uint mode;
        if (GetConsoleMode(hConsole, out mode)) {
            mode &= ~0x0040U; // ENABLE_QUICK_EDIT_MODE
            SetConsoleMode(hConsole, mode);
        }
    }
}
'@
[ConsoleUtility]::DisableQuickEdit()
`;
    await fs.writeFile(path.join(RELEASE_DIR, 'disable_quickedit.ps1'), ps1Content.trim());

    // Create start_server.bat
    const batContent = `@echo off
setlocal

:: Set the title of the command prompt window for easy identification
title Credit Request System Backend Server

echo ===================================================
echo Starting Credit Request System Backend Server...
echo ===================================================

:: Run the PowerShell script to safely disable QuickEdit mode dynamically
:: We use ExecutionPolicy Bypass to ensure the script runs even on restricted systems
powershell -ExecutionPolicy Bypass -File "%~dp0disable_quickedit.ps1" >nul 2>&1

:: Add bundled Node to PATH
set "PATH=%~dp0node;%PATH%"

:: Navigate to backend
cd backend

:: Start Server in the current window
echo Starting backend server...
node server.js

pause
`;
    await fs.writeFile(path.join(RELEASE_DIR, 'start_server.bat'), batContent);
  });

  // 9. Zip Release
  await logger.step('Zipping Release Folder', async (spinner) => {
    spinner.stop(); // Stop spinner to show progress bar
    console.log(''); // New line for bar

    // Count total files recursively for progress tracking
    const getTotalFiles = async (dir) => {
      let count = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += await getTotalFiles(fullPath);
        } else {
          count++;
        }
      }
      return count;
    };

    const totalFiles = await getTotalFiles(RELEASE_DIR);

    return new Promise((resolve, reject) => {
      const outputZip = path.join(ROOT_DIR, 'release.zip');
      const output = fs.createWriteStream(outputZip);
      const archive = archiver('zip', {
        zlib: { level: 5 } // Changed from 1 to 5 to offer a good trade-off between speed and final bundle size for air-gapped environments.
      });

      const progressBar = new cliProgress.SingleBar({
        format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} Files | {filename}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      }, cliProgress.Presets.shades_classic);

      progressBar.start(totalFiles, 0, {
        filename: 'Starting...'
      });

      output.on('close', () => {
        progressBar.stop();
        resolve();
      });

      archive.on('error', (err) => {
        progressBar.stop();
        reject(err);
      });

      let filesProcessed = 0;
      archive.on('entry', (entry) => {
        filesProcessed++;
        progressBar.update(filesProcessed, {
          filename: entry.name.length > 30 ? '...' + entry.name.slice(-27) : entry.name
        });
      });

      archive.pipe(output);

      // Append files from a sub-directory, putting its contents at the root of archive
      archive.directory(RELEASE_DIR, 'release');

      archive.finalize();
    });
  });

  // Success Summary
  console.log('');
  console.log(chalk.cyan('==================================================='));
  console.log(`✨  ${chalk.green.bold('Release created successfully!')}`);
  console.log(`   Location: ${chalk.underline(RELEASE_DIR)}`);
  console.log(`   Zip File: ${chalk.underline(path.join(ROOT_DIR, 'release.zip'))}`);
  console.log(chalk.cyan('==================================================='));

})();
