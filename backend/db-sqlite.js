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
        await createTableFromCSV('Customers', path.resolve(__dirname, 'Customers_rows.csv'), 'No_');

        // Initialize AY_ACCUM
        await createTableFromCSV('AY_ACCUM', path.resolve(__dirname, 'AY_ACCUM_rows.csv'), 'custcode');

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
            'payment_account_no'
        ];

        for (const col of coordinateColumns) {
            try {
                // Try to add column. If it exists, SQLite will throw an error, which we catch.
                await db.runAsync(`ALTER TABLE Customers ADD COLUMN ${col} TEXT`);
                console.log(`Added column ${col} to Customers`);
            } catch (err) {
                // Ignore error if column already exists
                if (!err.message.includes('duplicate column name')) {
                     console.error(`Error adding column ${col}:`, err);
                }
            }
        }

        // Create CreditRequests table manually
        db.run(`CREATE TABLE IF NOT EXISTS CreditRequests (
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
            { name: 'snapshot_data', type: 'TEXT' }
        ];

        for (const col of creditRequestColumns) {
            try {
                await db.runAsync(`ALTER TABLE CreditRequests ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Added column ${col.name} to CreditRequests`);
            } catch (err) {
                 if (!err.message.includes('duplicate column name')) {
                     console.error(`Error adding column ${col.name}:`, err);
                }
            }
        }

        // Create CreditRequestAttachments table
        db.run(`CREATE TABLE IF NOT EXISTS CreditRequestAttachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            file_type TEXT,
            file_path TEXT,
            original_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);

        // Create RequestComments table
        db.run(`CREATE TABLE IF NOT EXISTS RequestComments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            actor_role TEXT,
            comment_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);

        console.log('Database initialized (SQLite).');
    } catch (error) {
        console.error('Database initialization failed (SQLite):', error);
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

// Attach runAsync method to support Promise-based execution for INSERT/UPDATE
db.runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            // 'this' refers to the statement context, containing lastID and changes
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

db.dbType = 'sqlite';

module.exports = db;
