
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const checkBlacklist = async (taxId) => {
    if (!taxId) return { is_blacklisted: false, blacklist_data: null };
    // Normalize: Remove spaces, dashes
    const normalized = String(taxId).replace(/[^0-9a-zA-Z]/g, '');
    if (!normalized) return { is_blacklisted: false, blacklist_data: null };

    console.log(`Checking normalized Tax ID: '${normalized}' (Original: '${taxId}')`);

    // Query matching normalized ID
    const sql = `SELECT * FROM CustomerBlacklist WHERE REPLACE(REPLACE("เลขที่บัตรประชาชน", ' ', ''), '-', '') = ? LIMIT 1`;

    return new Promise((resolve, reject) => {
        db.all(sql, [normalized], (err, rows) => {
            if (err) return reject(err);
            console.log(`[Blacklist] Checking ${normalized}. Found: ${rows.length}`);
            if (rows && rows.length > 0) {
                console.log(`[Blacklist] MATCH:`, rows[0]);
                resolve({
                    is_blacklisted: true,
                    blacklist_data: {
                        status: rows[0]['สถานะ'],
                        remark: rows[0]['หมายเหตุ']
                    }
                });
            } else {
                resolve({ is_blacklisted: false, blacklist_data: null });
            }
        });
    });
};

const runTest = async () => {
    try {
        // Test 1: The ID from the CSV (with spaces)
        await checkBlacklist('3 7001 00118 99 1');

        // Test 2: The ID from the User's Screenshot (clean)
        await checkBlacklist('3700100118991');

        // Test 3: The ID that failed (40035RB -> Tax ID)
        // Assuming the API returns it clean or formatted
        await checkBlacklist('3 7001 00118 99 1');

    } catch (e) {
        console.error(e);
    } finally {
        db.close();
    }
};

runTest();
