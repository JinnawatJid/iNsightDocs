const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DB_PATH = path.join(__dirname, 'database.sqlite');
let db = null;

// Helper to create table from CSV (existing logic)
const createTableFromCSV = (db, tableName, csvPath) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => {
                if (rows.length === 0) {
                    return resolve();
                }

                const columns = Object.keys(rows[0]).map(col => `"${col}" TEXT`).join(', ');
                const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`;

                db.run(createTableSQL, (err) => {
                    if (err) return reject(err);

                    const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
                    const insertSQL = `INSERT INTO "${tableName}" VALUES (${placeholders})`;

                    db.serialize(() => {
                        const stmt = db.prepare(insertSQL);
                        rows.forEach(row => {
                            stmt.run(Object.values(row));
                        });
                        stmt.finalize((err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                });
            })
            .on('error', (err) => reject(err));
    });
}

// New helper for CreditRequests table
const createCreditRequestsTable = (db) => {
    return new Promise((resolve, reject) => {
        const sql = `
            CREATE TABLE IF NOT EXISTS CreditRequests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_id TEXT UNIQUE,
                customer_name TEXT,
                status TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        db.run(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const initialize = async () => {
    // Check if DB exists to decide if we need to load CSVs
    const dbExists = fs.existsSync(DB_PATH);

    db = new sqlite3.Database(DB_PATH);

    if (!dbExists) {
        console.log('Database not found. Initializing from CSV...');
        try {
            await createTableFromCSV(db, 'Customers', path.join(__dirname, 'Customers_rows.csv'));
            await createTableFromCSV(db, 'AY_ACCUM', path.join(__dirname, 'AY_ACCUM_rows.csv'));
        } catch (error) {
            console.error('CSV Import failed:', error);
            // We might want to exit or continue depending on severity
        }
    } else {
        console.log('Database exists. Connecting...');
    }

    // Always ensure CreditRequests table exists
    try {
        await createCreditRequestsTable(db);
        console.log('CreditRequests table verified.');
    } catch (error) {
        console.error('Failed to create CreditRequests table:', error);
    }

    console.log('Database initialization complete.');
};

const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Database not initialized. Ensure initialize() is called.'));
        }
        db.all(text, params, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve({ rows });
        });
    });
};

const run = (text, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Database not initialized. Ensure initialize() is called.'));
        }
        db.run(text, params, function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

module.exports = { initialize, query, run };
