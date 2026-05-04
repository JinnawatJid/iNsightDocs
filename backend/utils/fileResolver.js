const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const { getUploadBaseDir, getCustomerBaseDir } = require('./storagePaths');

/**
 * Robustly resolves a file path given a normalized DB path.
 * Handles exact matches, fallback bases, and loose matching for txId directory differences
 * (e.g., "10KKCA2604_01" vs "10KKCA2604_001").
 */
async function resolveFilePath(normalizedDbPath, uploadBase, projectRoot) {
    logger.debug(`[FileResolver] Attempting to resolve path: ${normalizedDbPath}`);

    // Candidate base directories to search within
    const baseDirs = Array.from(new Set([
        uploadBase,
        getUploadBaseDir(),
        getCustomerBaseDir(),
        path.join(projectRoot, 'uploads'),
        path.join(projectRoot, 'customers')
    ].filter(Boolean)));

    // 1. Try exact match first
    if (path.isAbsolute(normalizedDbPath) && await fs.pathExists(normalizedDbPath)) {
        logger.debug(`[FileResolver] Found exact absolute path: ${normalizedDbPath}`);
        return normalizedDbPath;
    }

    for (const base of baseDirs) {
        const exactCandidate = path.join(base, normalizedDbPath);
        if (await fs.pathExists(exactCandidate)) {
            logger.debug(`[FileResolver] Found exact relative path at: ${exactCandidate}`);
            return exactCandidate;
        }
    }

    logger.debug(`[FileResolver] Exact match failed. Falling back to loose matching for txId differences.`);

    // 2. Loose matching logic
    // The DB path format is usually: [CustomerNo]/[TxId_With_Underscores]/[Filename]
    // Example: "6903019KK/10KKCA2604_01/some_file.pdf"
    const pathParts = normalizedDbPath.split('/');
    if (pathParts.length >= 3) {
        const customerDirName = pathParts[0];
        const txIdDirName = pathParts[1];
        // The rest is the filename/subpath
        const fileNamePart = pathParts.slice(2).join('/');

        // Extract the base txId part (e.g. "10KKCA2604") and the running number part (e.g. "_01")
        const txIdMatch = txIdDirName.match(/^(.*?)_(\d+)$/);

        if (txIdMatch) {
            const baseTxId = txIdMatch[1];
            const runningNumberStr = txIdMatch[2];
            const runningNumber = parseInt(runningNumberStr, 10);

            logger.debug(`[FileResolver] Extracted TxId base: ${baseTxId}, running number: ${runningNumber}`);

            // Search through each candidate base directory
            for (const base of baseDirs) {
                const customerDirPath = path.join(base, customerDirName);

                if (await fs.pathExists(customerDirPath)) {
                    // Read all directories under the customer folder
                    try {
                        const subDirs = (await fs.readdir(customerDirPath, { withFileTypes: true }))
                                          .filter(dirent => dirent.isDirectory())
                                          .map(dirent => dirent.name);

                        // Look for a matching txId directory
                        for (const subDir of subDirs) {
                            const subDirMatch = subDir.match(/^(.*?)_(\d+)$/);
                            if (subDirMatch) {
                                const subBaseTxId = subDirMatch[1];
                                const subRunningNumber = parseInt(subDirMatch[2], 10);

                                // If base txId and integer value of running number match (e.g. _01 == _001)
                                if (baseTxId === subBaseTxId && runningNumber === subRunningNumber) {
                                    const looseCandidate = path.join(customerDirPath, subDir, fileNamePart);
                                    logger.debug(`[FileResolver] Testing loose candidate: ${looseCandidate}`);
                                    if (await fs.pathExists(looseCandidate)) {
                                        logger.debug(`[FileResolver] Found file via loose matching: ${looseCandidate}`);
                                        return looseCandidate;
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        logger.warn(`[FileResolver] Error reading directory ${customerDirPath}: ${err.message}`);
                    }
                }
            }
        }
    }

    logger.debug(`[FileResolver] File could not be resolved.`);
    return null;
}

module.exports = {
    resolveFilePath
};
