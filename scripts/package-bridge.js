import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SOURCE_DIR = path.join(ROOT_DIR, 'bridge-server');
const OUT_DIR = path.join(ROOT_DIR, 'public');
const OUT_FILE = path.join(OUT_DIR, 'bridge-standalone.zip');

const FILES_TO_INCLUDE = [
    'server.js',
    'package.json',
    'package-lock.json',
    'start_bridge.bat',
    'README.md'
];

(async () => {
    try {
        console.log(`Creating bridge package...`);

        // Ensure public dir exists
        await fs.ensureDir(OUT_DIR);

        const zip = new AdmZip();

        for (const file of FILES_TO_INCLUDE) {
            const filePath = path.join(SOURCE_DIR, file);
            if (await fs.pathExists(filePath)) {
                zip.addLocalFile(filePath);
                console.log(`Added: ${file}`);
            } else {
                console.warn(`Warning: ${file} not found in bridge-server/`);
            }
        }

        // Write zip
        zip.writeZip(OUT_FILE);
        console.log(`\nSuccess! Bridge package created at:\n${OUT_FILE}`);
        console.log(`Size: ${(fs.statSync(OUT_FILE).size / 1024).toFixed(2)} KB`);

    } catch (e) {
        console.error('Error creating bridge package:', e);
        process.exit(1);
    }
})();
