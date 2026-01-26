import fs from 'fs-extra';
import path from 'path';
import { exec, spawn } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import ora from 'ora';
import AdmZip from 'adm-zip';
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
  const logger = new Logger(8);
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
  await logger.step('Installing Production Dependencies (with Puppeteer Cache)', async () => {
    // Create .puppeteerrc.cjs to force local cache
    const puppeteerConfig = `const path = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: path.join(__dirname, '.cache', 'puppeteer'),
};
`;
    await fs.writeFile(path.join(RELEASE_DIR, 'backend', '.puppeteerrc.cjs'), puppeteerConfig);

    await runCommand('npm install --omit=dev', path.join(RELEASE_DIR, 'backend'));
  });

  // 8. Configure Environment
  await logger.step('Configuring Production Environment', async () => {
    // Ensure data directories exist
    await fs.ensureDir(path.join(RELEASE_DIR, 'backend', 'uploads'));
    await fs.ensureDir(path.join(RELEASE_DIR, 'backend', 'downloads'));

    // Create .env
    const envContent = [
      'PORT=3000',
      'DB_TYPE=mssql',
      'DB_USER=sa',
      'DB_PASSWORD=your_password_here',
      'DB_SERVER=localhost',
      'DB_PORT=1433',
      'DB_NAME=CreditRequestDB'
    ].join('\n');
    await fs.writeFile(path.join(RELEASE_DIR, 'backend', '.env'), envContent);

    // Create start_server.bat
    const batContent = `@echo off
setlocal

echo ===================================================
echo Starting Credit Request System...
echo ===================================================

:: Add bundled Node to PATH
set "PATH=%~dp0node;%PATH%"

:: Navigate to backend
cd backend

:: Start Server
node server.js

pause
`;
    await fs.writeFile(path.join(RELEASE_DIR, 'start_server.bat'), batContent);
  });

  // Success Summary
  console.log('');
  console.log(chalk.cyan('==================================================='));
  console.log(`✨  ${chalk.green.bold('Release created successfully!')}`);
  console.log(`   Location: ${chalk.underline(RELEASE_DIR)}`);
  console.log(chalk.cyan('==================================================='));

})();
