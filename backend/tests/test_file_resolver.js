const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const fileResolver = require('../utils/fileResolver');

async function runTests() {
    console.log('=== Starting FileResolver & Stream Guard Unit Tests ===\n');

    const tempTestRoot = path.join(__dirname, 'temp_test_env');

    try {
        // 1. Setup mock environment directory structure
        await fs.emptyDir(tempTestRoot);

        const uploadBase = path.join(tempTestRoot, 'uploads');
        const customerDir = path.join(uploadBase, '25002CB');
        const txIdDir = path.join(customerDir, 'CBCA6908_01');
        const dateSubdir = path.join(customerDir, '20260811'); // Folder matching timestamp segment

        await fs.ensureDir(uploadBase);
        await fs.ensureDir(customerDir);
        await fs.ensureDir(txIdDir);
        await fs.ensureDir(dateSubdir); // This is a DIRECTORY

        // Create a real PDF file inside txId folder
        const realPdfPath = path.join(txIdDir, '25002CB_ใบร้องขอ PC6908028_20260811_103131_849.pdf');
        await fs.writeFile(realPdfPath, '%PDF-1.4 Mock Content');

        // Create an unrelated file inside the date directory
        const unrelatedDbdFile = path.join(dateSubdir, 'DBD_BalanceSheet.xlsx');
        await fs.writeFile(unrelatedDbdFile, 'Mock DBD Excel');

        console.log('[Test Setup] Mock directory structure created successfully:');
        console.log(` - Directory (DBD folder): ${dateSubdir}`);
        console.log(` - Real Target File:       ${realPdfPath}`);
        console.log(` - Unrelated File:         ${unrelatedDbdFile}\n`);

        // ==========================================
        // Test 1: Subdirectory Ignored (EISDIR Prevention)
        // ==========================================
        console.log('Test 1: Ensuring date directory "20260811" is NEVER resolved as a file...');
        const resolvedPath1 = await fileResolver.resolveFilePath(
            '25002CB/CBCA6908_01/25002CB_ใบร้องขอ PC6908028_20260811_103131_849.pdf',
            uploadBase,
            tempTestRoot,
            'ใบร้องขอ PC6908028.pdf'
        );

        assert.strictEqual(
            resolvedPath1,
            realPdfPath,
            `Expected resolved path to be the PDF file, but got: ${resolvedPath1}`
        );

        const stat1 = await fs.stat(resolvedPath1);
        assert.ok(stat1.isFile(), 'Resolved path must be a regular file');
        console.log('  -> PASS: Successfully resolved exact regular file and ignored directory.\n');

        // ==========================================
        // Test 2: Inverted Fuzzy Match with Subfolder
        // ==========================================
        console.log('Test 2: DB path with legacy relative path and folder name collision...');
        const resolvedPath2 = await fileResolver.resolveFilePath(
            '25002CB/20260811', // If someone requests the date folder directly
            uploadBase,
            tempTestRoot,
            '20260811'
        );

        assert.strictEqual(
            resolvedPath2,
            null,
            `Expected null when resolving a directory name, but got: ${resolvedPath2}`
        );
        console.log('  -> PASS: Directory path correctly rejected and returned null.\n');

        // ==========================================
        // Test 3: Fuzzy Token & Thai Name Resolution
        // ==========================================
        console.log('Test 3: Resolving file via original Thai filename token...');
        const resolvedPath3 = await fileResolver.resolveFilePath(
            '25002CB/CBCA6908_01/unknown_name.pdf',
            uploadBase,
            tempTestRoot,
            'ใบร้องขอ PC6908028.pdf'
        );

        assert.strictEqual(
            resolvedPath3,
            realPdfPath,
            `Expected token matching to locate real PDF file, but got: ${resolvedPath3}`
        );
        console.log('  -> PASS: Successfully matched via originalName Thai tokens.\n');

        // ==========================================
        // Test 4: Non-existent File
        // ==========================================
        console.log('Test 4: Non-existent file returns null without crashing...');
        const resolvedPath4 = await fileResolver.resolveFilePath(
            '99999ZZ/NON_EXISTENT_TX/file.pdf',
            uploadBase,
            tempTestRoot,
            'unknown.pdf'
        );

        assert.strictEqual(resolvedPath4, null, 'Non-existent file must resolve to null');
        console.log('  -> PASS: Non-existent file gracefully returned null.\n');

        // ==========================================
        // Test 5: Cross-Revision Fallback Resolution
        // ==========================================
        console.log('Test 5: Cross-revision attachment fallback (R1 revision referencing base folder)...');
        const resolvedPath5 = await fileResolver.resolveFilePath(
            '25002CB/CBCA6908_01-R1/25002CB_ใบร้องขอ PC6908028_20260811_103131_849.pdf',
            uploadBase,
            tempTestRoot,
            'ใบร้องขอ PC6908028.pdf'
        );

        assert.strictEqual(
            resolvedPath5,
            realPdfPath,
            `Expected cross-revision lookup to find the file under base folder, but got: ${resolvedPath5}`
        );
        console.log('  -> PASS: Cross-revision attachment resolved successfully.\n');

        console.log('====================================================');
        console.log(' ALL UNIT TESTS PASSED SUCCESSFULLY! (5/5 passed)');
        console.log('====================================================');

    } catch (error) {
        console.error('TEST FAILED:', error);
        process.exitCode = 1;
    } finally {
        // Cleanup temporary mock directory
        await fs.remove(tempTestRoot);
    }
}

runTests();
