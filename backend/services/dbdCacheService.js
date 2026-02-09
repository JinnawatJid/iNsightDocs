const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const readdir = promisify(fs.readdir);

// Use a persistent path outside the backend deployment folder
// If running in development (no env var), fallback to a relative path
// This resolves to "dbd_cache" adjacent to the "backend" directory's grandparent (i.e. outside project root)
const CACHE_ROOT = process.env.DBD_CACHE_PATH || path.resolve(__dirname, '../../../../dbd_cache');

/**
 * Ensures the directory exists
 */
const ensureDir = async (dirPath) => {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
};

/**
 * Get current Thai Fiscal Year (or simply Calendar Year)
 * For simplicity, we use Calendar Year as DBD updates annually.
 */
const getCurrentYear = () => {
    return new Date().getFullYear().toString();
};

/**
 * Check if cache exists for a specific customer code and current year
 * @param {string} customerCode
 * @returns {Promise<{exists: boolean, year: string, path: string}>}
 */
const checkCache = async (customerCode) => {
    if (!customerCode) return { exists: false };

    // Sanitize customerCode to be safe for file system
    const safeCode = customerCode.replace(/[^a-zA-Z0-9-_]/g, '');
    const year = getCurrentYear();
    const cacheDir = path.join(CACHE_ROOT, safeCode, year);

    try {
        await access(cacheDir);
        const files = await readdir(cacheDir);
        // We need 3 specific files
        const required = ['balance_sheet.xlsx', 'profit_loss.xlsx', 'financial_ratios.xlsx'];
        const hasAll = required.every(f => files.includes(f));

        return { exists: hasAll, year, path: cacheDir };
    } catch (e) {
        return { exists: false, year, path: cacheDir };
    }
};

/**
 * Save file buffers to cache
 * @param {string} customerCode
 * @param {Object} files - Multer file objects or Buffers { balance_sheet, profit_loss, financial_ratios }
 */
const saveToCache = async (customerCode, files) => {
    if (!customerCode) return;

    // Sanitize customerCode
    const safeCode = customerCode.replace(/[^a-zA-Z0-9-_]/g, '');

    const year = getCurrentYear();
    const cacheDir = path.join(CACHE_ROOT, safeCode, year);

    await ensureDir(cacheDir);

    // Helper to write buffer
    const write = async (name, fileObj) => {
        if (!fileObj) return;
        // Handle both Multer object (has .buffer) or direct Buffer
        const buffer = fileObj.buffer || fileObj;
        await writeFile(path.join(cacheDir, name), buffer);
    };

    // Support both array (Multer) and direct object structures
    const getFile = (key) => {
        if (!files[key]) return null;
        if (Array.isArray(files[key])) return files[key][0];
        return files[key];
    };

    if (getFile('balance_sheet')) await write('balance_sheet.xlsx', getFile('balance_sheet'));
    if (getFile('profit_loss')) await write('profit_loss.xlsx', getFile('profit_loss'));
    if (getFile('financial_ratios')) await write('financial_ratios.xlsx', getFile('financial_ratios'));

    console.log(`[DBDCache] Saved cache for ${safeCode} / ${year} at ${cacheDir}`);
};

/**
 * Retrieve cached files as Buffers
 * @param {string} customerCode
 * @returns {Promise<Object>} - { balance_sheet: Buffer, profit_loss: Buffer, financial_ratios: Buffer }
 */
const getCachedFiles = async (customerCode) => {
    const { exists, path: cacheDir } = await checkCache(customerCode);
    if (!exists) throw new Error('Cache not found');

    const [bs, pl, fr] = await Promise.all([
        readFile(path.join(cacheDir, 'balance_sheet.xlsx')),
        readFile(path.join(cacheDir, 'profit_loss.xlsx')),
        readFile(path.join(cacheDir, 'financial_ratios.xlsx'))
    ]);

    return {
        balance_sheet: bs,
        profit_loss: pl,
        financial_ratios: fr
    };
};

module.exports = {
    checkCache,
    saveToCache,
    getCachedFiles,
    CACHE_ROOT
};
