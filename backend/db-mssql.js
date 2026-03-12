const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // Set to true if using Azure
        trustServerCertificate: true // Change to false for production
    }
};

let pool;

const connectDB = async () => {
    try {
        pool = await sql.connect(config);
        console.log('Connected to MSSQL');
    } catch (err) {
        console.error('Database connection failed (MSSQL):', err);
        // Do not exit, allow retry or fail gracefully
    }
};

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
            .on('end', async () => {
                if (headers.length === 0) {
                     console.log(`No headers in ${csvFilePath}, skipping table creation for ${tableName}`);
                     return resolve();
                }

                try {
                    const columns = headers;
                    // For simplicity, use NVARCHAR(MAX) for all columns to avoid type issues during import
                    // In a real scenario, we might want to infer types
                    let schema = columns.map(col => `"${col}" NVARCHAR(MAX)`).join(', ');

                    // Note: MSSQL Primary Keys on NVARCHAR(MAX) are not allowed (must be <= 900 bytes or 450 chars)
                    // So if we have a PK, we must limit its size.

                    if (primaryKey && columns.includes(primaryKey)) {
                         // Replace NVARCHAR(MAX) with NVARCHAR(255) for PK
                         schema = schema.replace(`"${primaryKey}" NVARCHAR(MAX)`, `"${primaryKey}" NVARCHAR(255) PRIMARY KEY`);
                    }

                    // MSSQL syntax for "CREATE TABLE IF NOT EXISTS"
                    const createTableSQL = `
                        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${tableName}' and xtype='U')
                        CREATE TABLE ${tableName} (${schema})
                    `;

                    await pool.request().query(createTableSQL);
                    console.log(`Table ${tableName} ensured.`);

                    // Check if data exists
                    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    if (countResult.recordset[0].count === 0 && rows.length > 0) {
                        console.log(`Importing ${rows.length} rows into ${tableName}...`);

                        // Use a transaction for bulk insert
                        const transaction = new sql.Transaction(pool);
                        await transaction.begin();

                        try {
                            for (const row of rows) {
                                const request = new sql.Request(transaction);
                                // Construct parameterized query
                                const cols = columns.map(col => `"${col}"`).join(',');
                                const params = columns.map((col, i) => `@p${i}`).join(',');

                                columns.forEach((col, i) => {
                                    request.input(`p${i}`, sql.NVarChar(sql.MAX), row[col]);
                                });

                                await request.query(`INSERT INTO ${tableName} (${cols}) VALUES (${params})`);
                            }

                            await transaction.commit();
                            console.log(`Imported ${rows.length} rows into ${tableName}`);
                        } catch (err) {
                            await transaction.rollback();
                            throw err;
                        }
                    }
                    resolve();

                } catch (err) {
                    console.error(`Error processing table ${tableName}:`, err);
                    reject(err);
                }
            });
    });
};

const initDB = async () => {
    if (!pool) await connectDB();
    if (!pool) return; // Connection failed

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
            // New columns
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
                // MSSQL check if column exists before adding
                const checkSql = `
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns
                        WHERE Name = '${col}' AND Object_ID = Object_ID('Customers')
                    )
                    BEGIN
                        ALTER TABLE Customers ADD ${col} NVARCHAR(255)
                    END
                `;
                await pool.request().query(checkSql);
                console.log(`Ensured column ${col} in Customers`);
            } catch (err) {
                 console.error(`Error adding column ${col}:`, err);
            }
        }

        // Create CreditRequests table manually
        // MSSQL Schema: id INT IDENTITY(1,1), others...
        const createCreditRequestsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CreditRequests' and xtype='U')
            CREATE TABLE CreditRequests (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tx_id NVARCHAR(255) UNIQUE,
                customer_no NVARCHAR(255),
                customer_name NVARCHAR(255),
                status NVARCHAR(50),
                created_at DATETIME DEFAULT GETDATE()
            )
        `;
        await pool.request().query(createCreditRequestsSQL);

        // Ensure new columns exist in CreditRequests table (for existing DBs)
        const creditRequestColumns = [
            { name: 'request_amount', type: 'REAL' },
            { name: 'request_reason', type: 'NVARCHAR(MAX)' },
            { name: 'request_credit_term', type: 'REAL' },
            { name: 'snapshot_data', type: 'NVARCHAR(MAX)' },
            { name: 'term_gs', type: 'INT' },
            { name: 'term_ae', type: 'INT' },
            { name: 'term_yc', type: 'INT' },
            { name: 'request_type', type: 'NVARCHAR(255)' },
            { name: 'updated_at', type: 'DATETIME' }
        ];

        for (const col of creditRequestColumns) {
            try {
                 const checkSql = `
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns
                        WHERE Name = '${col.name}' AND Object_ID = Object_ID('CreditRequests')
                    )
                    BEGIN
                        ALTER TABLE CreditRequests ADD ${col.name} ${col.type}
                    END
                `;
                await pool.request().query(checkSql);
                console.log(`Added column ${col.name} to CreditRequests`);
            } catch (err) {
                 console.error(`Error adding column ${col.name}:`, err);
            }
        }

        // Migration: Copy request_credit_term to new columns if they are NULL (Legacy Data)
        try {
            const migrationSQL = `
                UPDATE CreditRequests
                SET term_gs = CAST(request_credit_term AS INT),
                    term_ae = CAST(request_credit_term AS INT),
                    term_yc = CAST(request_credit_term AS INT)
                WHERE term_gs IS NULL AND request_credit_term IS NOT NULL
            `;
            await pool.request().query(migrationSQL);
            console.log('Migrated legacy credit terms to new columns.');
        } catch (e) {
            console.error('Error migrating legacy credit terms:', e);
        }

        // Migration: Ensure request_type is large enough
        try {
             const alterSql = `
                IF EXISTS (
                    SELECT * FROM sys.columns
                    WHERE Name = 'request_type' AND Object_ID = Object_ID('CreditRequests')
                )
                BEGIN
                    ALTER TABLE CreditRequests ALTER COLUMN request_type NVARCHAR(255)
                END
            `;
            // Note: We need a new request object for this query if reusing pool.request() could be problematic in loop, but here it is fine.
            const req = new sql.Request(pool);
            await req.query(alterSql);
            console.log('Ensured request_type column size is NVARCHAR(255)');
        } catch (err) {
             console.error('Error altering request_type column:', err);
        }

         // Create CreditRequestAttachments table
        const createCreditRequestAttachmentsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CreditRequestAttachments' and xtype='U')
            CREATE TABLE CreditRequestAttachments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tx_id NVARCHAR(255),
                file_type NVARCHAR(255),
                file_path NVARCHAR(MAX),
                original_name NVARCHAR(255),
                created_at DATETIME DEFAULT GETDATE(),
                FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
            )
        `;
        await pool.request().query(createCreditRequestAttachmentsSQL);

        // Create RequestComments table
        const createRequestCommentsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RequestComments' and xtype='U')
            CREATE TABLE RequestComments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tx_id NVARCHAR(255),
                actor_role NVARCHAR(255),
                comment_text NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE(),
                FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
            )
        `;
        await pool.request().query(createRequestCommentsSQL);

        console.log('Database initialized (MSSQL).');
    } catch (error) {
        console.error('Database initialization failed (MSSQL):', error);
    }
};

const db = {
    dbType: 'mssql',
    initialize: initDB,
    query: async (sqlQuery, params = []) => {
        if (!pool) throw new Error('Database not connected');

        // Convert '?' placeholders to @p0, @p1... for MSSQL
        // This is a naive replacement. Ideally, we should use named parameters if possible,
        // but to match SQLite style '?' we need to replace them.

        let mssqlQuery = sqlQuery;
        const request = pool.request();

        // Split by '?' and reconstruct
        // WARNING: This naive split fails if '?' is inside a string literal.
        // Assuming simple queries for now as per current codebase.

        if (params.length > 0) {
            const parts = mssqlQuery.split('?');
            mssqlQuery = parts.reduce((acc, part, i) => {
                if (i < parts.length - 1) {
                    const paramName = `param${i}`;
                    request.input(paramName, params[i]); // Auto-detect type
                    return acc + part + `@${paramName}`;
                }
                return acc + part;
            }, '');
        }

        try {
            const result = await request.query(mssqlQuery);
            // Normalize output to match { rows: [...] }
            return { rows: result.recordset };
        } catch (err) {
            console.error('Query error:', err);
            throw err;
        }
    },
    runAsync: async (sqlQuery, params = []) => {
        if (!pool) throw new Error('Database not connected');

        // Same parameter handling
        let mssqlQuery = sqlQuery;
        const request = pool.request();

        if (params.length > 0) {
            const parts = mssqlQuery.split('?');
            mssqlQuery = parts.reduce((acc, part, i) => {
                if (i < parts.length - 1) {
                    const paramName = `param${i}`;
                    request.input(paramName, params[i]);
                    return acc + part + `@${paramName}`;
                }
                return acc + part;
            }, '');
        }

        // For INSERT, we need the ID. MSSQL doesn't return it automatically in run().
        // We append "SELECT SCOPE_IDENTITY() AS id" to the query if it's an INSERT.
        // But we have to be careful not to break other statements.
        // For now, let's execute.

        try {
            // Append explicit scope identity selection for inserts to mimic SQLite's this.lastID
            // Note: This only works if the original query is a single INSERT statement
            const isInsert = /^\s*INSERT\s/i.test(sqlQuery);
            if (isInsert) {
                mssqlQuery += '; SELECT SCOPE_IDENTITY() AS id;';
            }

            const result = await request.query(mssqlQuery);

            let lastID = null;
            if (isInsert && result.recordset && result.recordset.length > 0) {
                lastID = result.recordset[0].id;
            }

            return {
                id: lastID, // mimics this.lastID
                changes: result.rowsAffected[0] // mimics this.changes
            };
        } catch (err) {
            console.error('RunAsync error:', err);
            throw err;
        }
    }
};

module.exports = db;
