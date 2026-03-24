const logger = require('../utils/logger');
const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 2) {
    logger.info('Usage: node migrate_uploads.js <source_dir> <target_dir>');
    logger.info('Example: node migrate_uploads.js ../SP682_1_3/backend/uploads ../../uploads');
    process.exit(1);
}

const sourceDir = path.resolve(args[0]);
const targetDir = path.resolve(args[1]);

logger.info(`Migration Tool`);
logger.info(`Source: ${sourceDir}`);
logger.info(`Target: ${targetDir}`);

if (!fs.existsSync(sourceDir)) {
    logger.error(`Error: Source directory does not exist: ${sourceDir}`);
    process.exit(1);
}

const migrate = async () => {
    try {
        await fs.ensureDir(targetDir);

        // Get all files recursively
        const files = [];

        const walk = async (dir) => {
            const list = await fs.readdir(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                const stat = await fs.stat(filePath);
                if (stat.isDirectory()) {
                    await walk(filePath);
                } else {
                    files.push(filePath);
                }
            }
        };

        logger.info('Scanning source files...');
        await walk(sourceDir);
        logger.info(`Found ${files.length} files.`);

        let movedCount = 0;
        let errorCount = 0;

        for (const file of files) {
            // Calculate relative path from source
            const relativePath = path.relative(sourceDir, file);
            const targetPath = path.join(targetDir, relativePath);

            try {
                // Ensure target parent exists
                await fs.ensureDir(path.dirname(targetPath));

                // Check if target exists
                if (await fs.pathExists(targetPath)) {
                    logger.warn(`[SKIP] Target exists: ${relativePath}`);
                } else {
                    // Move (Copy + Delete to be safe across partitions, but fs.move handles that)
                    // We use copy first then remove to be safe, or fs.move with overwrite false
                    await fs.move(file, targetPath, { overwrite: false });
                    process.stdout.write('.');
                    movedCount++;
                }
            } catch (err) {
                logger.error(`\n[ERROR] Failed to move ${relativePath}: ${err.message}`);
                errorCount++;
            }
        }

        logger.info('\n\nMigration Complete.');
        logger.info(`Moved: ${movedCount}`);
        logger.info(`Errors: ${errorCount}`);
        logger.info(`Skipped (Already Exists): ${files.length - movedCount - errorCount}`);

    } catch (err) {
        logger.error('Fatal Error:', err);
    }
};

migrate();
