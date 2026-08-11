const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Robustly resolves a file path given a normalized DB path.
 * Performs exact matching, customer subdirectory matching, txId matching,
 * and recursive candidate searching across all candidate upload roots.
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

    // Candidate base directories to search within
    const baseDirs = [
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
        cwd
    ].filter(Boolean);

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

    logger.info(`[FileResolver] Exact match failed for ${cleanPath}. Searching customer and txId subdirectories...`);

    const pathParts = cleanPath.split('/');
    const fileNamePart = pathParts[pathParts.length - 1];
    const targetBasename = path.basename(fileNamePart);

    const candidateFilenames = new Set([targetBasename]);
    if (originalName) candidateFilenames.add(path.basename(originalName));

    // 3. Search by Customer Dir (pathParts[0]) or TxID Dir (pathParts[1])
    if (pathParts.length >= 2) {
        const customerDirName = pathParts[0];
        const txIdDirName = pathParts.length >= 3 ? pathParts[1] : null;

        for (const base of baseDirs) {
            // Check direct txId folder under base (e.g. uploads/TLCA6908_01-R2/filename)
            if (txIdDirName) {
                const txIdDirPath = path.join(base, txIdDirName);
                if (await fs.pathExists(txIdDirPath)) {
                    for (const cand of candidateFilenames) {
                        const fileInTxId = path.join(txIdDirPath, cand);
                        if (await fs.pathExists(fileInTxId)) {
                            logger.info(`[FileResolver] Found file in txId dir: ${fileInTxId}`);
                            return fileInTxId;
                        }
                    }
                }
            }

            // Check customer dir under base (e.g. uploads/40088RY/...)
            const customerDirPath = path.join(base, customerDirName);
            if (await fs.pathExists(customerDirPath)) {
                try {
                    // Check direct files under customerDirPath
                    for (const cand of candidateFilenames) {
                        const directFile = path.join(customerDirPath, cand);
                        if (await fs.pathExists(directFile)) {
                            logger.info(`[FileResolver] Found file directly under customer dir: ${directFile}`);
                            return directFile;
                        }
                    }

                    // Scan all subfolders under customerDirPath
                    const entries = await fs.readdir(customerDirPath, { withFileTypes: true });
                    for (const cand of candidateFilenames) {
                        for (const entry of entries) {
                            if (entry.isDirectory()) {
                                const subCandidate = path.join(customerDirPath, entry.name, cand);
                                if (await fs.pathExists(subCandidate)) {
                                    logger.info(`[FileResolver] Found file in subfolder ${entry.name}: ${subCandidate}`);
                                    return subCandidate;
                                }
                            }
                        }
                    }

                    // Loose search: find any file in subfolders matching keywords
                    const cleanKeyword = targetBasename.replace(/^[\w]+_/, '').replace(/_\d+_\d+\.[\w]+$/, '');
                    if (cleanKeyword && cleanKeyword.length > 3) {
                        for (const entry of entries) {
                            if (entry.isDirectory()) {
                                const subFiles = await fs.readdir(path.join(customerDirPath, entry.name));
                                for (const sf of subFiles) {
                                    if (sf.includes(cleanKeyword) || (originalName && sf.includes(originalName))) {
                                        const fuzzyMatch = path.join(customerDirPath, entry.name, sf);
                                        logger.info(`[FileResolver] Found fuzzy match file: ${fuzzyMatch}`);
                                        return fuzzyMatch;
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    logger.warn(`[FileResolver] Error searching ${customerDirPath}: ${err.message}`);
                }
            }
        }
    }

    // 4. Fallback: Search all baseDirs recursively for any file matching targetBasename or originalName
    logger.info(`[FileResolver] Falling back to recursive scan across baseDirs for candidate filenames: ${Array.from(candidateFilenames).join(', ')}`);
    for (const base of baseDirs) {
        if (await fs.pathExists(base)) {
            const found = await searchDirRecursive(base, candidateFilenames, 0, 3);
            if (found) {
                logger.info(`[FileResolver] Found file via recursive base scan: ${found}`);
                return found;
            }
        }
    }

    logger.warn(`[FileResolver] File could NOT be resolved on disk for ${normalizedDbPath} (checked bases: ${baseDirs.join('; ')})`);
    return null;
}

async function searchDirRecursive(dir, candidateFilenames, currentDepth, maxDepth) {
    if (currentDepth > maxDepth) return null;
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                if (candidateFilenames.has(entry.name)) {
                    return fullPath;
                }
            } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subFound = await searchDirRecursive(fullPath, candidateFilenames, currentDepth + 1, maxDepth);
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
