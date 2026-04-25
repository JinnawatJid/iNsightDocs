const db = require('../db');
const logger = require('./logger');
const fs = require('fs-extra');

/**
 * Checks if any of the provided files exceed the database-configured max size limit.
 * If validation fails, it deletes all files passed in to prevent disk leaks.
 * @param {Array|Object} files - The req.files object or array from multer.
 * @returns {Promise<{isValid: boolean, limitMB: number, rejectedFiles: string[]}>}
 */
const checkDynamicUploadLimit = async (files) => {
    let limitMB = 50; // default
    try {
        const result = await db.query("SELECT config_value FROM Configurations WHERE config_key = 'MAX_FILE_UPLOAD_SIZE_MB'");
        if (result && result.rows && result.rows.length > 0) {
            limitMB = parseInt(result.rows[0].config_value, 10) || 50;
        }
    } catch (e) {
        logger.error('Error fetching MAX_FILE_UPLOAD_SIZE_MB for upload limit check:', e);
    }

    const limitBytes = limitMB * 1024 * 1024;
    const rejectedFiles = [];

    const fileList = [];
    if (Array.isArray(files)) {
        fileList.push(...files);
    } else if (files && typeof files === 'object') {
        Object.values(files).forEach(fileArr => {
            if (Array.isArray(fileArr)) {
                fileList.push(...fileArr);
            } else {
                fileList.push(fileArr); // for single file object
            }
        });
    }

    for (const f of fileList) {
        if (f.size > limitBytes) {
            rejectedFiles.push(f.originalname || f.name);
        }
    }

    if (rejectedFiles.length > 0) {
        // Delete all files if any file fails validation
        for (const f of fileList) {
            if (f.path && fs.existsSync(f.path)) {
                try {
                    fs.unlinkSync(f.path);
                    logger.info(`Deleted file ${f.path} due to size limit violation.`);
                } catch (err) {
                    logger.error(`Error deleting file ${f.path}:`, err);
                }
            }
        }
    }

    return {
        isValid: rejectedFiles.length === 0,
        limitMB,
        rejectedFiles
    };
};

module.exports = {
    checkDynamicUploadLimit
};
