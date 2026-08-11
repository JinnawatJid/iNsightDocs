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
        .replace(/^[\w]+_/, '')
        .replace(/(_\d+){2,3}\.\w+$/, '')
        .replace(/\.\w+$/, '');

    const candidateKeywords = new Set([
        targetBasename,
        targetBasename.toLowerCase(),
        originalName,
        originalName ? originalName.toLowerCase() : null,
        originalName ? path.parse(originalName).name : null,
        coreKeyword,
        coreKeyword.toLowerCase()
    ].filter(Boolean));

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

                    // Scan all subfolders under customerDirPath
                    const entries = await fs.readdir(customerDirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const subDir = path.join(customerDirPath, entry.name);
                            const subMatch = await matchFileInDir(subDir, candidateKeywords);
                            if (subMatch) {
                                logger.info(`[FileResolver] Found file in customer subfolder ${entry.name}: ${subMatch}`);
                                return subMatch;
                            }
                        }
                    }
                } catch (err) {
                    logger.warn(`[FileResolver] Error searching ${customerDirPath}: ${err.message}`);
                }
            }
        }
    }

    // 4. Fallback: Search all baseDirs recursively for any file matching candidateKeywords
    logger.info(`[FileResolver] Falling back to recursive scan across baseDirs...`);
    for (const base of baseDirs) {
        if (await fs.pathExists(base)) {
            const found = await searchDirRecursive(base, candidateKeywords, 0, 3);
            if (found) {
                logger.info(`[FileResolver] Found file via recursive base scan: ${found}`);
                return found;
            }
        }
    }

    logger.warn(`[FileResolver] File could NOT be resolved on disk for ${normalizedDbPath} (checked bases: ${baseDirs.join('; ')})`);
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
                if (fileLower === candLower || fileLower.includes(candLower) || (fileNameNoExt.length > 3 && candLower.includes(fileNameNoExt))) {
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
                    if (entryLower === candLower || entryLower.includes(candLower) || (entryNameNoExt.length > 3 && candLower.includes(entryNameNoExt))) {
                        return fullPath;
                    }
                }
            } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subFound = await searchDirRecursive(fullPath, candidateKeywords, currentDepth + 1, maxDepth);
                if (subFound) return subFound;
            }
        }
    } catch (e) {
        // ignore unreadable dirs
    }
    return null;
}

module.exports = {
    resolveFilePath
};
