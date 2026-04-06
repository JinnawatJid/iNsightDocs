const logger = require('./utils/logger');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { normalizeName } = require('./utils/nameNormalizer');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Attach runAsync method to support Promise-based execution for INSERT/UPDATE
// Defined early so it can be used if needed, though createTableFromCSV uses callbacks currently.
db.runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            // 'this' refers to the statement context, containing lastID and changes
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

// Helper to create table from CSV if not exists
const createTableFromCSV = (tableName, csvFilePath, primaryKey = null) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (headerList) => {
                headers = headerList.map(h => h.trim());
                // Add normalized columns for CustomerBlacklist
                if (tableName === 'CustomerBlacklist') {
                    headers.push('normalized_id');
                    headers.push('normalized_name');
                    headers.push('normalized_shop');
                }
            })
            .on('data', (row) => {
                // Normalize row keys (trim)
                const newRow = {};
                Object.keys(row).forEach(key => {
                    newRow[key.trim()] = row[key];
                });

                // Add normalized values for CustomerBlacklist
                if (tableName === 'CustomerBlacklist') {
                    // Tax ID
                    const rawId = newRow['เลขที่บัตรประชาชน'] || '';
                    newRow['normalized_id'] = rawId.replace(/\D/g, '');

                    // Customer Name (Person)
                    const rawName = newRow['ชื่อ - ลูกค้า'] || '';
                    newRow['normalized_name'] = normalizeName(rawName);

                    // Shop Name (Business)
                    const rawShop = newRow['ชื่อ - ร้าน'] || '';
                    newRow['normalized_shop'] = normalizeName(rawShop);
                }

                rows.push(newRow);
            })
            .on('end', () => {
                if (headers.length === 0) {
                     logger.info(`No headers in ${csvFilePath}, skipping table creation for ${tableName}`);
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
                        logger.error(`Error creating table ${tableName}:`, err);
                        reject(err);
                    } else {
                        logger.info(`Table ${tableName} ensured.`);

                        // Check if data exists
                        db.get(`SELECT count(*) as count FROM ${tableName}`, (err, row) => {
                            if (err) return reject(err);
                            if (row.count === 0 && rows.length > 0) {
                                // Insert data
                                const placeholders = columns.map(() => '?').join(',');
                                // Use INSERT OR IGNORE to handle duplicate keys gracefully
                                const insertSQL = `INSERT OR IGNORE INTO ${tableName} ("${columns.join('","')}") VALUES (${placeholders})`;
                                const stmt = db.prepare(insertSQL);

                                rows.forEach(row => {
                                    // Skip rows with empty primary key if defined
                                    if (primaryKey && (!row[primaryKey] || row[primaryKey].trim() === '')) {
                                        return;
                                    }
                                    // Ensure values are ordered according to headers
                                    const values = columns.map(col => row[col]);
                                    stmt.run(values);
                                });
                                stmt.finalize();
                                logger.info(`Imported ${rows.length} rows into ${tableName}`);
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
        await createTableFromCSV('Customers', path.resolve(__dirname, 'Customers_rows.csv'), 'No_');

        // Initialize AY_ACCUM
        await createTableFromCSV('AY_ACCUM', path.resolve(__dirname, 'AY_ACCUM_rows.csv'), 'custcode');

        // Initialize CustomerBlacklist
        // Drop table first to ensure schema update (adding normalized_id)
        await db.runAsync('DROP TABLE IF EXISTS CustomerBlacklist');
        await createTableFromCSV('CustomerBlacklist', path.resolve(__dirname, 'CustomerBlacklist_rows.csv'), 'เลขที่บัตรประชาชน');

        // Ensure Coordinate and Landmark columns exist in Customers table
        const coordinateColumns = [
            'residence_latitude',
            'residence_longitude',
            'store_latitude',
            'store_longitude',
            'residence_landmark',
            'residence_note',
            'store_landmark',
            'store_note',
            'residence_map_code',
            'store_map_code',
            // New columns for Contact/Authorized Person
            'authorized_person',
            'authorized_position',
            'contact_position',
            'contact_phone_number',
            // New columns for Location Type and Ownership
            'residence_location_type',
            'residence_location_type_other',
            'residence_ownership',
            'residence_ownership_other',
            'store_location_type',
            'store_location_type_other',
            'store_ownership',
            'store_ownership_other',
            // New columns for Signatory 2 and Business Info
            'authorized_person_2',
            'authorized_position_2',
            'business_type',
            'main_products',
            'years_in_business',
            // New columns for Contact Department and Division
            'contact_department',
            'contact_division',
            // New columns for Billing Information
            'billing_requirement',
            'billing_requirement_note',
            'billing_method',
            'billing_method_note',
            'billing_schedule',
            'billing_contact',
            'billing_department',
            'billing_phone',
            'billing_mobile',
            'billing_email',
            // New column for Existing Credits
            'existing_credits',
            // Payment Details
            'payment_method',
            'payment_condition',
            'payment_bank_name',
            'payment_bank_branch',
            'payment_account_no',
            // Credit Status (N, P, NPL, L)
            'credit_status',
            // New columns for Property Value
            'residence_value',
            'store_value',
            // Has Other Credit
            'has_other_credit',
            // Real credit limits and terms
            'credit_limit_real',
            'term_gs',
            'term_ae',
            'term_yc',
            'status_code',
            'has_tungnam_relationship',
            'tungnam_relationship_customer_id',
            'tungnam_relationship_note'
        ];

        for (const col of coordinateColumns) {
            try {
                // Try to add column. If it exists, SQLite will throw an error, which we catch.
                let alterSql = `ALTER TABLE Customers ADD COLUMN ${col} TEXT`;
                // Set default for credit_status
                if (col === 'credit_status' || col === 'status_code') {
                    alterSql += ` DEFAULT 'N'`;
                } else if (['credit_limit_real', 'term_gs', 'term_ae', 'term_yc'].includes(col)) {
                    if (col === 'credit_limit_real') {
                        alterSql = `ALTER TABLE Customers ADD COLUMN ${col} REAL DEFAULT 0`;
                    } else {
                        alterSql = `ALTER TABLE Customers ADD COLUMN ${col} INTEGER DEFAULT 0`;
                    }
                }
                await db.runAsync(alterSql);
                logger.info(`Added column ${col} to Customers`);
            } catch (err) {
                // Ignore error if column already exists
                if (!err.message.includes('duplicate column name')) {
                     logger.error(`Error adding column ${col}:`, err);
                }
            }
        }

        // Create CreditRequests table manually
        await db.runAsync(`CREATE TABLE IF NOT EXISTS CreditRequests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT UNIQUE,
            customer_no TEXT,
            customer_name TEXT,
            status TEXT,
            request_amount REAL,
            request_reason TEXT,
            request_credit_term REAL,
            snapshot_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Ensure new columns exist in CreditRequests table (for existing DBs)
        const creditRequestColumns = [
            { name: 'request_amount', type: 'REAL' },
            { name: 'request_reason', type: 'TEXT' },
            { name: 'request_credit_term', type: 'REAL' },
            { name: 'snapshot_data', type: 'TEXT' },
            { name: 'term_gs', type: 'INTEGER' },
            { name: 'term_ae', type: 'INTEGER' },
            { name: 'term_yc', type: 'INTEGER' },
            { name: 'request_type', type: 'TEXT' },
            { name: 'updated_at', type: 'DATETIME' }
        ];

        for (const col of creditRequestColumns) {
            try {
                await db.runAsync(`ALTER TABLE CreditRequests ADD COLUMN ${col.name} ${col.type}`);
                logger.info(`Added column ${col.name} to CreditRequests`);
            } catch (err) {
                 if (!err.message.includes('duplicate column name')) {
                     logger.error(`Error adding column ${col.name}:`, err);
                }
            }
        }

        // Migration: Copy request_credit_term to new columns if they are NULL (Legacy Data)
        try {
            await db.runAsync(`
                UPDATE CreditRequests
                SET term_gs = CAST(request_credit_term AS INTEGER),
                    term_ae = CAST(request_credit_term AS INTEGER),
                    term_yc = CAST(request_credit_term AS INTEGER)
                WHERE term_gs IS NULL AND request_credit_term IS NOT NULL
            `);
            logger.info('Migrated legacy credit terms to new columns.');
        } catch (e) {
            logger.error('Error migrating legacy credit terms:', e);
        }

        // Create CreditRequestAttachments table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS CreditRequestAttachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            file_type TEXT,
            file_path TEXT,
            original_name TEXT,
            uploaded_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);

        // Ensure new columns exist in CreditRequestAttachments table (for existing DBs)
        const attachmentColumns = [
            { name: 'uploaded_by', type: 'TEXT' },
            { name: 'is_deleted', type: 'INTEGER DEFAULT 0' }
        ];

        for (const col of attachmentColumns) {
            try {
                await db.runAsync(`ALTER TABLE CreditRequestAttachments ADD COLUMN ${col.name} ${col.type}`);
                logger.info(`Added column ${col.name} to CreditRequestAttachments`);
            } catch (err) {
                 if (!err.message.includes('duplicate column name')) {
                     logger.error(`Error adding column ${col.name} to CreditRequestAttachments:`, err);
                }
            }
        }

        // Create RequestComments table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS RequestComments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            actor_role TEXT,
            comment_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);

        // Migration: Update 3-digit tx_id to 2-digit tx_id (e.g., 00TRCA2603/001 -> 00TRCA2603/01)
        try {
            const txs = await db.allAsync(`SELECT tx_id FROM CreditRequests WHERE tx_id LIKE '%/%'`);
            if (txs && txs.length > 0) {
                for (const tx of txs) {
                    const txId = tx.tx_id;
                    const parts = txId.split('/');
                    if (parts.length === 2 && parts[1].length === 3 && !isNaN(parseInt(parts[1], 10))) {
                        const newTxId = `${parts[0]}/${parts[1].substring(1)}`;

                        await db.runAsync(`UPDATE CreditRequests SET tx_id = ? WHERE tx_id = ?`, [newTxId, txId]);
                        await db.runAsync(`UPDATE CreditRequestAttachments SET tx_id = ? WHERE tx_id = ?`, [newTxId, txId]);
                        await db.runAsync(`UPDATE RequestComments SET tx_id = ? WHERE tx_id = ?`, [newTxId, txId]);
                    }
                }
            }
        } catch (e) {
            logger.error('Error migrating 3-digit tx_id to 2-digit tx_id:', e);
        }

        logger.info('Database initialized (SQLite).');
    } catch (error) {
        logger.error('Database initialization failed (SQLite):', error);
    }
};

// Attach initialize function to db object to allow server.js to wait for initialization
db.initialize = initDB;

// Attach query method to support Promise-based execution (db.query) used in controllers
db.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve({ rows });
        });
    });
};

db.dbType = 'sqlite';

module.exports = db;
