const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Robustly resolves a file path given a normalized DB path.
 * Handles exact matches, fallback bases, revision folder variations (-R1, -R2),
 * and loose matching across customer subdirectories.
 */
async function resolveFilePath(normalizedDbPath, uploadBase, projectRoot) {
    if (!normalizedDbPath) return null;
    logger.debug(`[FileResolver] Attempting to resolve path: ${normalizedDbPath}`);

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
        path.join(root, 'customers'),
        path.resolve(cwd, 'uploads'),
        path.resolve(cwd, '../uploads'),
        cwd
    ].filter(Boolean);

    // 1. Try exact absolute path first
    if (path.isAbsolute(cleanPath) && await fs.pathExists(cleanPath)) {
        logger.debug(`[FileResolver] Found exact absolute path: ${cleanPath}`);
        return cleanPath;
    }

    // 2. Try exact candidate in baseDirs
    for (const base of baseDirs) {
        const exactCandidate = path.join(base, cleanPath);
        if (await fs.pathExists(exactCandidate)) {
            logger.debug(`[FileResolver] Found exact relative path at: ${exactCandidate}`);
            return exactCandidate;
        }
    }

    logger.debug(`[FileResolver] Exact match failed. Searching customer subdirectories...`);

    // 3. Fallback search by Customer Dir & Filename across all revision subfolders
    const pathParts = cleanPath.split('/');
    if (pathParts.length >= 2) {
        const customerDirName = pathParts[0];
        const fileNamePart = pathParts[pathParts.length - 1];
        const targetBasename = path.basename(fileNamePart);

        for (const base of baseDirs) {
            const customerDirPath = path.join(base, customerDirName);
            if (await fs.pathExists(customerDirPath)) {
                try {
                    // Check files directly in customerDirPath
                    const directFile = path.join(customerDirPath, targetBasename);
                    if (await fs.pathExists(directFile)) {
                        logger.debug(`[FileResolver] Found file directly under customer dir: ${directFile}`);
                        return directFile;
                    }

                    // Check subfolders (e.g. TLCA6908_01, TLCA6908_01-R1, TLCA6908_01-R2)
                    const entries = await fs.readdir(customerDirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const subCandidate = path.join(customerDirPath, entry.name, targetBasename);
                            if (await fs.pathExists(subCandidate)) {
                                logger.debug(`[FileResolver] Found file in subfolder ${entry.name}: ${subCandidate}`);
                                return subCandidate;
                            }
                        }
                    }
                } catch (err) {
                    logger.warn(`[FileResolver] Error searching ${customerDirPath}: ${err.message}`);
                }
            }
        }
    }

    logger.debug(`[FileResolver] File could not be resolved for ${normalizedDbPath}`);
    return null;
}

module.exports = {
    resolveFilePath
};
