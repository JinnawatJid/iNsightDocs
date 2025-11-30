const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper to create table from CSV if not exists
const createTableFromCSV = (tableName, csvFilePath, primaryKey = null) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (headerList) => {
                headers = headerList;
            })
            .on('data', (row) => rows.push(row))
            .on('end', () => {
                if (headers.length === 0) {
                     console.log(`No headers in ${csvFilePath}, skipping table creation for ${tableName}`);
                     return resolve();
                }

                const columns = headers;
                let schema = columns.map(col => `"${col}" TEXT`).join(', ');

                if (primaryKey) {
                    // Check if primary key exists in columns
                    if (columns.includes(primaryKey)) {
                         schema = schema.replace(`"${primaryKey}" TEXT`, `"${primaryKey}" TEXT PRIMARY KEY`);
                    }
                }

                const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;

                db.run(createTableSQL, (err) => {
                    if (err) {
                        console.error(`Error creating table ${tableName}:`, err);
                        reject(err);
                    } else {
                        console.log(`Table ${tableName} ensured.`);

                        // Check if data exists
                        db.get(`SELECT count(*) as count FROM ${tableName}`, (err, row) => {
                            if (err) return reject(err);
                            if (row.count === 0 && rows.length > 0) {
                                // Insert data
                                const placeholders = columns.map(() => '?').join(',');
                                const insertSQL = `INSERT INTO ${tableName} ("${columns.join('","')}") VALUES (${placeholders})`;
                                const stmt = db.prepare(insertSQL);

                                rows.forEach(row => {
                                    // Ensure values are ordered according to headers
                                    const values = columns.map(col => row[col]);
                                    stmt.run(values);
                                });
                                stmt.finalize();
                                console.log(`Imported ${rows.length} rows into ${tableName}`);
                            }
                            resolve();
                        });
                    }
                });
            });
    });
};

const initDB = async () => {
    try {
        // Initialize Customers
        await createTableFromCSV('Customers', path.resolve(__dirname, '../src/data/customers.csv'), 'No_');

        // Initialize AY_ACCUM
        await createTableFromCSV('AY_ACCUM', path.resolve(__dirname, '../src/data/ay_accum.csv'), 'custcode');

        // Create CreditRequests table manually as it's not from CSV
        db.run(`CREATE TABLE IF NOT EXISTS CreditRequests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT UNIQUE,
            customer_name TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('Database initialized.');
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
};

initDB();

module.exports = db;
