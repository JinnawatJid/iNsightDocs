const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Robustly resolves a file path given a normalized DB path and optional originalName.
 * Performs exact matching, customer/txId subdirectory matching, timestamp stripping,
 * fuzzy keyword matching, and recursive candidate searching across all potential upload roots.
 */
async function resolveFilePath(normalizedDbPath, uploadBase, projectRoot, originalName = null) {
    if (!normalizedDbPath) return null;
    logger.info(`[FileResolver] Attempting to resolve path: ${normalizedDbPath}, originalName: ${originalName}`);

    // Normalize slashes and strip legacy prefixes
    let cleanPath = String(normalizedDbPath).replace(/\\/g, '/');
    if (cleanPath.startsWith("customers/")) cleanPath = cleanPath.replace(/^customers\//, "");
    if (cleanPath.startsWith("uploads/")) cleanPath = cleanPath.replace(/^uploads\//, "");

    const cwd = process.cwd();
    const root = projectRoot || cwd;

    // Comprehensive list of candidate base directories
    const baseDirs = Array.from(new Set([
        uploadBase,
        path.join(root, 'uploads'),
        path.join(root, 'backend', 'uploads'),
        path.join(root, 'customers'),
        path.resolve(cwd, 'uploads'),
        path.resolve(cwd, '../uploads'),
        path.resolve(cwd, 'backend/uploads'),
        path.resolve(__dirname, '../uploads'),
        path.resolve(__dirname, '../../uploads'),
        path.resolve(__dirname, '../../../uploads'),
        path.resolve(__dirname, '../../../../uploads'),
        cwd
    ].filter(Boolean)));

    // 1. Try exact absolute path first
    if (path.isAbsolute(cleanPath) && await fs.pathExists(cleanPath)) {
        logger.info(`[FileResolver] Found exact absolute path: ${cleanPath}`);
        return cleanPath;
    }

    // 2. Try exact relative candidate in baseDirs
    for (const base of baseDirs) {
        const exactCandidate = path.join(base, cleanPath);
        if (await fs.pathExists(exactCandidate)) {
            logger.info(`[FileResolver] Found exact relative path at: ${exactCandidate}`);
            return exactCandidate;
        }
    }

    logger.info(`[FileResolver] Exact match failed for ${cleanPath}. Building search keywords...`);

    const pathParts = cleanPath.split('/');
    const fileNamePart = pathParts[pathParts.length - 1];
    const targetBasename = path.basename(fileNamePart);

    // Extract core keyword by stripping customer prefix (e.g. 40088RY_) and timestamp suffix (e.g. _20260805_152253_969.pdf)
    const coreKeyword = targetBasename
        .replace(/^[A-Za-z0-9]+_/, '')
        .replace(/(_\d+){2,4}\.\w+$/, '')
        .replace(/\.\w+$/, '');

    const candidateKeywords = new Set([
        targetBasename,
        targetBasename.toLowerCase(),
        originalName,
        originalName ? originalName.toLowerCase() : null,
        originalName ? path.parse(originalName).name : null,
        originalName ? path.parse(originalName).name.toLowerCase() : null,
        coreKeyword,
        coreKeyword.toLowerCase()
    ].filter(Boolean));

    // Filter out file extensions and generic short numbers from tokens
    const ignoreTokens = new Set(['xlsx', 'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'txt', 'csv', 'js', 'json', 'njs', 'bits']);
    const tokens = (originalName || targetBasename).split(/[\s_\-\.]+/).filter(t => {
        if (!t || t.length < 3) return false;
        const lower = t.toLowerCase();
        if (ignoreTokens.has(lower)) return false;
        if (/^\d{1,4}$/.test(t)) return false;
        return true;
    });

    for (const tok of tokens) {
        candidateKeywords.add(tok.toLowerCase());
    }

    logger.info(`[FileResolver] Candidate keywords: ${Array.from(candidateKeywords).join(', ')}`);

    // 3. Search by Customer Dir (pathParts[0]) or TxID Dir (pathParts[1])
    if (pathParts.length >= 2) {
        const customerDirName = pathParts[0];
        const txIdDirName = pathParts.length >= 3 ? pathParts[1] : null;

        for (const base of baseDirs) {
            // Check direct txId folder under base (e.g. uploads/TLCA6908_01-R2/filename)
            if (txIdDirName) {
                const txIdDirPath = path.join(base, txIdDirName);
                if (await fs.pathExists(txIdDirPath)) {
                    const match = await matchFileInDir(txIdDirPath, candidateKeywords);
                    if (match) {
                        logger.info(`[FileResolver] Found file in txId dir: ${match}`);
                        return match;
                    }
                }
            }

            // Check customer dir under base (e.g. uploads/40088RY/...)
            const customerDirPath = path.join(base, customerDirName);
            if (await fs.pathExists(customerDirPath)) {
                try {
                    // Check direct files under customerDirPath
                    const matchDirect = await matchFileInDir(customerDirPath, candidateKeywords);
                    if (matchDirect) {
                        logger.info(`[FileResolver] Found file directly under customer dir: ${matchDirect}`);
                        return matchDirect;
                    }

                    // Recursively scan customerDirPath for ANY matching file
                    const subMatch = await searchDirRecursive(customerDirPath, candidateKeywords, 0, 5);
                    if (subMatch) {
                        logger.info(`[FileResolver] Found file inside customer subfolder: ${subMatch}`);
                        return subMatch;
                    }
                } catch (e) {}
            }
        }
    }

    // 4. Full Fallback Search across candidate base roots
    logger.info(`[FileResolver] Falling back to recursive scan across baseDirs...`);
    for (const base of baseDirs) {
        if (await fs.pathExists(base)) {
            const found = await searchDirRecursive(base, candidateKeywords, 0, 4);
            if (found) {
                logger.info(`[FileResolver] Found file via recursive base scan: ${found}`);
                return found;
            }
        }
    }

    return null;
}

async function matchFileInDir(dirPath, candidateKeywords) {
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const fileLower = file.toLowerCase();
            const fileNameNoExt = path.parse(fileLower).name;

            for (const cand of candidateKeywords) {
                if (!cand) continue;
                const candLower = String(cand).toLowerCase();
                if (fileLower === candLower || fileLower.includes(candLower) || (fileNameNoExt.length >= 3 && candLower.includes(fileNameNoExt))) {
                    return path.join(dirPath, file);
                }
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
}

async function searchDirRecursive(dir, candidateKeywords, currentDepth, maxDepth) {
    if (currentDepth > maxDepth) return null;
    const ignoreDirs = new Set(['node_modules', '.git', '.vscode', 'dist', 'build']);
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                const entryLower = entry.name.toLowerCase();
                const entryNameNoExt = path.parse(entryLower).name;

                for (const cand of candidateKeywords) {
                    if (!cand) continue;
                    const candLower = String(cand).toLowerCase();
                    if (entryLower === candLower || entryLower.includes(candLower) || (entryNameNoExt.length >= 3 && candLower.includes(entryNameNoExt))) {
                        return fullPath;
                    }
                }
            } else if (entry.isDirectory() && !entry.name.startsWith('.') && !ignoreDirs.has(entry.name.toLowerCase())) {
                const subFound = await searchDirRecursive(fullPath, candidateKeywords, currentDepth + 1, maxDepth);
                if (subFound) return subFound;
            }
        }
    } catch (e) {
        // ignore unreadable dirs
    }
    return null;
}

async function getSearchedRootsInfo(normalizedDbPath, uploadBase, projectRoot) {
    let cleanPath = String(normalizedDbPath || '').replace(/\\/g, '/');
    if (cleanPath.startsWith("customers/")) cleanPath = cleanPath.replace(/^customers\//, "");
    if (cleanPath.startsWith("uploads/")) cleanPath = cleanPath.replace(/^uploads\//, "");

    const pathParts = cleanPath.split('/');
    const customerDirName = pathParts[0] || '';

    const cwd = process.cwd();
    const root = projectRoot || cwd;

    const baseDirs = Array.from(new Set([
        uploadBase,
        path.join(root, 'uploads'),
        path.join(root, 'backend', 'uploads'),
        path.join(root, 'customers'),
        path.resolve(cwd, 'uploads'),
        path.resolve(cwd, '../uploads'),
        path.resolve(cwd, 'backend/uploads')
    ].filter(Boolean)));

    const info = {};

    for (const base of baseDirs) {
        try {
            const baseExists = await fs.pathExists(base);
            info[base] = { exists: baseExists };
            if (baseExists) {
                const baseEntries = await fs.readdir(base);
                info[base].topEntries = baseEntries.slice(0, 15);

                if (customerDirName) {
                    const custPath = path.join(base, customerDirName);
                    const custExists = await fs.pathExists(custPath);
                    if (custExists) {
                        const custEntries = await fs.readdir(custPath, { withFileTypes: true });
                        const custContents = {};
                        for (const entry of custEntries) {
                            if (entry.isDirectory()) {
                                const subPath = path.join(custPath, entry.name);
                                const subFiles = await fs.readdir(subPath);
                                custContents[entry.name] = subFiles;
                            } else {
                                custContents[entry.name] = 'FILE';
                            }
                        }
                        info[base][`customer_${customerDirName}`] = custContents;
                    }
                }
            }
        } catch (e) {
            info[base] = { error: e.message };
        }
    }
    return info;
}

module.exports = {
    resolveFilePath,
    getSearchedRootsInfo
};
