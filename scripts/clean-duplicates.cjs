const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') }); // Load env if exists

const db = require('../backend/db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function cleanDuplicates(txId) {
    if (!txId) {
        txId = await askQuestion('Please enter the Transaction ID (tx_id): ');
    }

    if (!txId) {
        console.error('Error: Transaction ID is required.');
        process.exit(1);
    }

    try {
        console.log(`\n==================================================`);
        console.log(` Analyzing duplicates for txId: ${txId}`);
        console.log(`==================================================\n`);

        // Fetch all active attachments for this txId
        let sql = `SELECT id, original_name, file_type, file_path, created_at FROM CreditRequestAttachments WHERE tx_id = ? AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY id DESC`;
        const { rows: attachments } = await db.query(sql, [txId]);

        if (!attachments || attachments.length === 0) {
            console.log('No active attachments found for this transaction ID.\n');
            process.exit(0);
        }

        // Group by file_type
        const groupedFiles = {};
        for (const att of attachments) {
            // Ignore 'other_' docs as they allow multiple files
            if (att.file_type.startsWith('other_')) {
                continue;
            }

            if (!groupedFiles[att.file_type]) {
                groupedFiles[att.file_type] = [];
            }
            groupedFiles[att.file_type].push(att);
        }

        let totalDuplicates = 0;
        const idsToDelete = [];

        for (const [fileType, files] of Object.entries(groupedFiles)) {
            if (files.length > 1) {
                console.log(`[${fileType}] Found ${files.length} records:`);

                // files are ordered by id DESC, so files[0] is the newest
                const newestFile = files[0];
                const duplicates = files.slice(1);

                console.log(`  ✅ KEEPING (Newest):`);
                console.log(`     ID: ${newestFile.id} | Name: ${newestFile.original_name}`);

                console.log(`  ❌ TO DELETE (Duplicates):`);
                for (const dup of duplicates) {
                    console.log(`     ID: ${dup.id} | Name: ${dup.original_name}`);
                    idsToDelete.push(dup.id);
                    totalDuplicates++;
                }
                console.log('--------------------------------------------------');
            }
        }

        if (totalDuplicates === 0) {
            console.log('✅ No duplicate records found for single-upload fields.\n');
            process.exit(0);
        }

        console.log(`\nSummary: ${totalDuplicates} duplicate record(s) will be soft-deleted.`);
        console.log(`⚠️  Note: Physical files will NOT be deleted to prevent data loss.\n`);

        const confirmation = await askQuestion('Type "YES" to confirm and delete these duplicates, or anything else to cancel: ');

        if (confirmation === 'YES') {
            console.log('\nProcessing deletion...');

            for (const id of idsToDelete) {
                const deleteSql = `UPDATE CreditRequestAttachments SET is_deleted = 1 WHERE id = ?`;
                await db.runAsync(deleteSql, [id]);
                console.log(` ✔️ Soft-deleted ID: ${id}`);
            }

            console.log('\n🎉 Cleanup completed successfully!\n');
        } else {
            console.log('\n❌ Operation cancelled. No changes were made.\n');
        }

    } catch (error) {
        console.error('\n❌ An error occurred:', error);
    } finally {
        rl.close();
        process.exit(0);
    }
}

// Get txId from command line arguments
const txIdArg = process.argv[2];
cleanDuplicates(txIdArg);
