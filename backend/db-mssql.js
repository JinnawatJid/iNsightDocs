const logger = require('./utils/logger');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();
const { normalizeName } = require('./utils/nameNormalizer');

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

const LEGACY_APPROVAL_ROLE_MAP = {
    'ผู้อนุมัติ (วงเงิน <300K)': 'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)',
    'ผู้อนุมัติ (วงเงิน > 300K)': 'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)'
};

const normalizeApprovalRole = (role) => LEGACY_APPROVAL_ROLE_MAP[role] || role;

const migrateApprovalRoles = (configValue) => {
    if (!configValue) return configValue;

    const clone = JSON.parse(JSON.stringify(configValue));

    if (Array.isArray(clone.roles)) {
        clone.roles = clone.roles.map(normalizeApprovalRole);
    }

    if (clone.matrix && typeof clone.matrix === 'object') {
        const migratedMatrix = {};
        Object.entries(clone.matrix).forEach(([role, permissions]) => {
            const normalizedRole = normalizeApprovalRole(role);
            if (!migratedMatrix[normalizedRole]) {
                migratedMatrix[normalizedRole] = [];
            }
            migratedMatrix[normalizedRole] = Array.from(new Set([...(migratedMatrix[normalizedRole] || []), ...(permissions || [])]));
        });
        clone.matrix = migratedMatrix;
    }

    return clone;
};

const migrateWorkflowApprovalRoles = (configValue) => {
    if (!configValue || !configValue.states) return configValue;

    const clone = JSON.parse(JSON.stringify(configValue));
    Object.values(clone.states).forEach((state) => {
        if (Array.isArray(state.actionableByRoles)) {
            state.actionableByRoles = state.actionableByRoles.map(normalizeApprovalRole);
        }
    });

    return clone;
};

const connectDB = async () => {
    try {
        pool = await sql.connect(config);
        logger.info('Connected to MSSQL');
    } catch (err) {
        logger.error('Database connection failed (MSSQL):', err);
        // Do not exit, allow retry or fail gracefully
    }
};

// Helper to create table from CSV if not exists
const createTableFromCSV = (tableName, csvFilePath, primaryKey = null) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers = [];
        const seenKeys = new Set();
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (headerList) => {
                // Filter out empty headers (e.g. from trailing commas in CSV) to prevent MSSQL errors
                headers = headerList.map(h => h.trim()).filter(h => h.length > 0);

                // Add normalized columns for CustomerBlacklist
                if (tableName === 'CustomerBlacklist') {
                    headers.push('normalized_id');
                    headers.push('normalized_name');
                    headers.push('normalized_shop');
                }
            })
            .on('data', (row) => {
                // Normalize row keys (trim) and only keep keys that correspond to valid headers
                const newRow = {};
                Object.keys(row).forEach(key => {
                    const trimmedKey = key.trim();
                    if (trimmedKey.length > 0) {
                        newRow[trimmedKey] = row[key];
                    }
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

                // Deduplicate rows if primaryKey is provided
                if (primaryKey) {
                    const pkValue = newRow[primaryKey];
                    if (!pkValue || pkValue.trim() === '') return; // Skip empty primary keys
                    if (seenKeys.has(pkValue)) return; // Skip duplicates
                    seenKeys.add(pkValue);
                }

                rows.push(newRow);
            })
            .on('end', async () => {
                if (headers.length === 0) {
                     logger.info(`No headers in ${csvFilePath}, skipping table creation for ${tableName}`);
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
                    logger.info(`Table ${tableName} ensured.`);

                    // Check if data exists
                    const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);


                    if (countResult.recordset[0].count === 0 && rows.length > 0) {
                        logger.info(`Importing ${rows.length} rows into ${tableName}...`);

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


                                // Avoid Duplicate PK Error on insert
                                let insertQuery = `INSERT INTO ${tableName} (${cols}) VALUES (${params})`;
                                if (primaryKey && columns.includes(primaryKey)) {
                                    insertQuery = `
                                        IF NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "${primaryKey}" = @p${columns.indexOf(primaryKey)})
                                        BEGIN
                                            INSERT INTO ${tableName} (${cols}) VALUES (${params})
                                        END
                                    `;
                                }
                                await request.query(insertQuery);
                            }

                            await transaction.commit();
                            logger.info(`Imported ${rows.length} rows into ${tableName}`);
                        } catch (err) {
                            await transaction.rollback();
                            throw err;
                        }
                    }
                    resolve();

                } catch (err) {
                    logger.error(`Error processing table ${tableName}:`, err);
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

        // Initialize CustomerBlacklist
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
                // MSSQL check if column exists before adding
                let alterTableQuery = `ALTER TABLE Customers ADD ${col} NVARCHAR(255)`;
                if (col === 'credit_status' || col === 'status_code') {
                    alterTableQuery += ` DEFAULT 'N'`;
                } else if (['credit_limit_real', 'term_gs', 'term_ae', 'term_yc'].includes(col)) {
                    // For numeric types we use FLOAT or INT, but coordinateColumns creates NVARCHAR by default
                    // Let's create them as FLOAT for limit, and INT for terms
                    if (col === 'credit_limit_real') {
                        alterTableQuery = `ALTER TABLE Customers ADD ${col} FLOAT DEFAULT 0`;
                    } else {
                        alterTableQuery = `ALTER TABLE Customers ADD ${col} INT DEFAULT 0`;
                    }
                }

                const checkSql = `
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns
                        WHERE Name = '${col}' AND Object_ID = Object_ID('Customers')
                    )
                    BEGIN
                        ${alterTableQuery}
                    END
                `;
                await pool.request().query(checkSql);
                logger.info(`Ensured column ${col} in Customers`);
            } catch (err) {
                 logger.error(`Error adding column ${col}:`, err);
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
                created_at DATETIME DEFAULT GETUTCDATE(),
                updated_at DATETIME DEFAULT GETUTCDATE(),
                created_by NVARCHAR(255),
                updated_by NVARCHAR(255)
            )
        `;
        await pool.request().query(createCreditRequestsSQL);

        // Ensure new columns exist in CreditRequests table (for existing DBs)
        const creditRequestColumns = [
            { name: 'request_amount', type: 'REAL' },
            { name: 'request_reason', type: 'NVARCHAR(MAX)' },
            { name: 'request_credit_term', type: 'REAL' },
            { name: 'snapshot_data', type: 'NVARCHAR(MAX)' },
            { name: 'original_snapshot', type: 'NVARCHAR(MAX)' },
            { name: 'term_gs', type: 'INT' },
            { name: 'term_ae', type: 'INT' },
            { name: 'term_yc', type: 'INT' },
            { name: 'request_type', type: 'NVARCHAR(255)' },
            { name: 'updated_at', type: 'DATETIME' },
            { name: 'created_by', type: 'NVARCHAR(255)' },
            { name: 'updated_by', type: 'NVARCHAR(255)' }
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
                logger.info(`Added column ${col.name} to CreditRequests`);
            } catch (err) {
                 logger.error(`Error adding column ${col.name}:`, err);
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
            logger.info('Migrated legacy credit terms to new columns.');
        } catch (e) {
            logger.error('Error migrating legacy credit terms:', e);
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
            logger.info('Ensured request_type column size is NVARCHAR(255)');
        } catch (err) {
             logger.error('Error altering request_type column:', err);
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
                uploaded_by NVARCHAR(255),
                created_at DATETIME DEFAULT GETUTCDATE(),
                updated_at DATETIME DEFAULT GETUTCDATE(),
                updated_by NVARCHAR(255),
                FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
            )
        `;
        await pool.request().query(createCreditRequestAttachmentsSQL);

        // Ensure new columns exist in CreditRequestAttachments table (for existing DBs)
        const attachmentColumns = [
            { name: 'uploaded_by', type: 'NVARCHAR(255)' },
            { name: 'is_deleted', type: 'BIT DEFAULT 0' },
            { name: 'updated_by', type: 'NVARCHAR(255)' }
        ];

        for (const col of attachmentColumns) {
            try {
                 const checkSql = `
                    IF NOT EXISTS (
                        SELECT * FROM sys.columns
                        WHERE Name = '${col.name}' AND Object_ID = Object_ID('CreditRequestAttachments')
                    )
                    BEGIN
                        ALTER TABLE CreditRequestAttachments ADD ${col.name} ${col.type}
                    END
                `;
                await pool.request().query(checkSql);
                logger.info(`Added column ${col.name} to CreditRequestAttachments`);
            } catch (err) {
                 logger.error(`Error adding column ${col.name} to CreditRequestAttachments:`, err);
            }
        }


        // Create CustomerDocuments table
        const createCustomerDocumentsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CustomerDocuments' and xtype='U')
            CREATE TABLE CustomerDocuments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                customer_no NVARCHAR(255),
                file_type NVARCHAR(255),
                file_path NVARCHAR(MAX),
                original_name NVARCHAR(255),
                uploaded_by NVARCHAR(255),
                created_at DATETIME DEFAULT GETUTCDATE(),
                updated_at DATETIME DEFAULT GETUTCDATE()
            )
        `;
        await pool.request().query(createCustomerDocumentsSQL);

        // Create RequestComments table
        const createRequestCommentsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RequestComments' and xtype='U')
            CREATE TABLE RequestComments (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tx_id NVARCHAR(255),
                actor_role NVARCHAR(255),
                comment_text NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETUTCDATE(),
                updated_at DATETIME DEFAULT GETUTCDATE(),
                username NVARCHAR(255),
                FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
            )
        `;
        await pool.request().query(createRequestCommentsSQL);

        try {
             const checkSql = `
                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE Name = 'username' AND Object_ID = Object_ID('RequestComments')
                )
                BEGIN
                    ALTER TABLE RequestComments ADD username NVARCHAR(255)
                END
            `;
            await pool.request().query(checkSql);
            logger.info(`Added column username to RequestComments`);
        } catch (err) {
             logger.error(`Error adding column username to RequestComments:`, err);
        }

        // Migration: Update 3-digit tx_id to 2-digit tx_id (e.g., 00TRCA2603/001 -> 00TRCA2603/01)
        try {
            const result = await pool.request().query(`SELECT tx_id FROM CreditRequests WHERE tx_id LIKE '%/%'`);
            if (result.recordset && result.recordset.length > 0) {
                const customersDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'customers');

                // Get all column names from CreditRequests dynamically to safely duplicate the row
                const columnsResult = await pool.request().query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'CreditRequests' AND COLUMN_NAME != 'id' AND COLUMN_NAME != 'tx_id'
                `);
                const columnNames = columnsResult.recordset.map(r => r.COLUMN_NAME).join(', ');

                for (const row of result.recordset) {
                    try {
                        const txId = row.tx_id;
                        const parts = txId.split('/');
                        const runningNum = parseInt(parts[1], 10);
                        if (parts.length === 2 && parts[1].length === 3 && !isNaN(runningNum) && runningNum <= 99) {
                            const newTxId = `${parts[0]}/${runningNum.toString().padStart(2, '0')}`;
                            const oldFolderName = txId.replace(/\//g, '_');
                            const newFolderName = newTxId.replace(/\//g, '_');

                            // MSSQL strictly enforces foreign keys. To avoid constraint errors without ON UPDATE CASCADE:
                            // 1. Insert duplicate row in parent table with new ID.
                            await pool.request()
                                .input('newTxId', sql.NVarChar, newTxId)
                                .input('txId', sql.NVarChar, txId)
                                .query(`
                                    INSERT INTO CreditRequests (tx_id, ${columnNames})
                                    SELECT @newTxId, ${columnNames}
                                    FROM CreditRequests WHERE tx_id = @txId
                                `);

                            // 2. Update child tables to point to new ID and update file_path
                            await pool.request()
                                .input('newTxId', sql.NVarChar, newTxId)
                                .input('txId', sql.NVarChar, txId)
                                .input('oldFolder', sql.NVarChar, oldFolderName)
                                .input('newFolder', sql.NVarChar, newFolderName)
                                .query(`UPDATE CreditRequestAttachments SET tx_id = @newTxId, file_path = REPLACE(file_path, @oldFolder, @newFolder) WHERE tx_id = @txId`);

                            await pool.request()
                                .input('newTxId', sql.NVarChar, newTxId)
                                .input('txId', sql.NVarChar, txId)
                                .query(`UPDATE RequestComments SET tx_id = @newTxId WHERE tx_id = @txId`);

                            // 3. Delete old row from parent table.
                            await pool.request()
                                .input('txId', sql.NVarChar, txId)
                                .query(`DELETE FROM CreditRequests WHERE tx_id = @txId`);

                            // Rename physical folder if it exists
                            try {

                                if (fs.existsSync(customersDir)) {
                                    const customerDirs = fs.readdirSync(customersDir);
                                    for (const custDir of customerDirs) {
                                        const oldPath = path.join(customersDir, custDir, oldFolderName);
                                        if (fs.existsSync(oldPath)) {
                                            const newPath = path.join(customersDir, custDir, newFolderName);
                                            fs.renameSync(oldPath, newPath);
                                            break;
                                        }
                                    }
                                }
                            } catch (fsErr) {
                                logger.error(`Error renaming folder for tx_id ${txId}:`, fsErr);
                            }
                        }
                    } catch (innerErr) {
                        logger.error(`Error migrating single tx_id ${row.tx_id}:`, innerErr);
                    }
                }
            }
        } catch (e) {
            logger.error('Error migrating 3-digit tx_id to 2-digit tx_id:', e);
        }

        // Create Configurations table
        const createConfigurationsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Configurations' and xtype='U')
            CREATE TABLE Configurations (
                config_key NVARCHAR(255) PRIMARY KEY,
                config_value NVARCHAR(MAX),
                data_type NVARCHAR(50),
                category NVARCHAR(100),
                description NVARCHAR(MAX),
                label NVARCHAR(255),
                updated_at DATETIME DEFAULT GETUTCDATE(),
                updated_by NVARCHAR(255)
            )
        `;
        await pool.request().query(createConfigurationsSQL);

        const createNotificationsSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' and xtype='U')
            CREATE TABLE Notifications (
                id INT IDENTITY(1,1) PRIMARY KEY,
                tx_id NVARCHAR(255),
                target_role NVARCHAR(255),
                target_username NVARCHAR(255),
                message NVARCHAR(MAX),
                is_read BIT DEFAULT 0,
                read_by NVARCHAR(MAX) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.request().query(createNotificationsSQL);

        // Ensure new column exists in Configurations table (for existing DBs)
        try {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE object_id = OBJECT_ID('Configurations') AND name = 'label'
                )
                BEGIN
                    ALTER TABLE Configurations ADD label NVARCHAR(255)
                END
            `);
            logger.info(`Ensured column label exists in Configurations`);
        } catch (err) {
             logger.error(`Error adding column label to Configurations:`, err);
        }

        // Seed default configuration if not exists
        const initialWorkflowConfig = {
            states: {
                Draft: {
                    label: "ฉบับร่าง",
                    type: "initial",
                    actionableByRoles: ["ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)"],
                    allowedTransitions: ["Opened", "Canceled"]
                },
                Opened: {
                    label: "รอดำเนินการ",
                    type: "active",
                    actionableByRoles: ["ผู้พิจารณาของพื้นที่"],
                    allowedTransitions: ["RegionalSubmitted", "Rejected"]
                },
                RegionalSubmitted: {
                    label: "ผ่านการพิจารณาพื้นที่",
                    type: "active",
                    actionableByRoles: ["ผู้พิจารณาฝ่ายขาย"],
                    allowedTransitions: ["SalesSubmitted", "Rejected"]
                },
                SalesSubmitted: {
                    label: "ผ่านการพิจารณาฝ่ายขาย",
                    type: "active",
                    actionableByRoles: ["ผู้ตรวจสอบเอกสาร"],
                    allowedTransitions: ["FinanceReviewed", "Rejected"]
                },
                FinanceReviewed: {
                    label: "ผ่านการตรวจสอบเอกสาร",
                    type: "active",
                    actionableByRoles: ["ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)"],
                    allowedTransitions: ["Approved", "Reviewed", "Rejected"]
                },
                Reviewed: {
                    label: "รอคณะกรรมการพิจารณา",
                    type: "active",
                    actionableByRoles: ["ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)"],
                    allowedTransitions: ["Approved", "Rejected"]
                },
                Approved: {
                    label: "อนุมัติแล้ว",
                    type: "final",
                    actionableByRoles: [],
                    allowedTransitions: []
                },
                Rejected: {
                    label: "ไม่อนุมัติ",
                    type: "final",
                    actionableByRoles: [],
                    allowedTransitions: []
                },
                Canceled: {
                    label: "ยกเลิก",
                    type: "final",
                    actionableByRoles: [],
                    allowedTransitions: []
                }
            }
        };

                const initialRbacMatrix = {
            roles: [
                'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)',
                'ผู้พิจารณาของพื้นที่',
                'ผู้พิจารณาฝ่ายขาย',
                'ผู้ตรวจสอบเอกสาร',
                'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)',
                'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)',
                'ผู้ดูแลระบบ'
            ],
            permissions: [
                { key: 'page:create-credit', label: 'เข้าถึงหน้า: สร้างคำขอ / ค้นหาลูกค้า' },
                { key: 'page:pending-requests', label: 'เข้าถึงหน้า: คำขอทั้งหมด' },
                { key: 'page:batch-automation', label: 'เข้าถึงหน้า: ระบบอัตโนมัติ' },
                { key: 'page:system-configuration', label: 'เข้าถึงหน้า: ตั้งค่าระบบ' },
                { key: 'create_request', label: 'สร้างคำขอสินเชื่อ' },
                { key: 'approve_credit_low', label: 'อนุมัติวงเงินต่ำกว่าเกณฑ์' },
                { key: 'approve_credit_high', label: 'อนุมัติวงเงินสูงกว่าเกณฑ์' },
                { key: 'manage_blacklist', label: 'จัดการรายการ NPL (Blacklist)' }
            ],
            matrix: {
                'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)': ['create_request', 'page:create-credit', 'page:pending-requests'],
                'ผู้พิจารณาของพื้นที่': ['page:create-credit', 'page:pending-requests'],
                'ผู้พิจารณาฝ่ายขาย': ['page:create-credit', 'page:pending-requests'],
                'ผู้ตรวจสอบเอกสาร': ['page:create-credit', 'page:pending-requests', 'page:batch-automation'],
                'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)': ['approve_credit_low', 'page:create-credit', 'page:pending-requests'],
                'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)': ['approve_credit_high', 'page:create-credit', 'page:pending-requests'],
                'ผู้ดูแลระบบ': ['manage_blacklist', 'page:create-credit', 'page:pending-requests', 'page:system-configuration']
            }
        };

const initialRegionBranchConfig = [
            {
                region: "กทม (Metro)",
                zones: [
                    { code: "TJ", name: "ตรอกจันทน์" },
                    { code: "TR", name: "พระราม 2" },
                    { code: "TS", name: "สุขาภิบาล 3" },
                    { code: "TP", name: "บางขุนเทียน" },
                    { code: "TL", name: "ลำลูกกา" }
                ]
            },
            {
                region: "กลาง (Central)",
                zones: [
                    { code: "BS", name: "บางไทร" },
                    { code: "RB", name: "ราชบุรี" },
                    { code: "AY", name: "อยุธยา" },
                    { code: "PC", name: "ประจวบ" },
                    { code: "SB", name: "สระบุรี" }
                ]
            },
            {
                region: "เหนือ (North)",
                zones: [
                    { code: "CM", name: "เชียงใหม่" },
                    { code: "CR", name: "เชียงราย" },
                    { code: "NS", name: "นครสวรรค์" },
                    { code: "PL", name: "พิษณุโลก" }
                ]
            },
            {
                region: "ตะวันออก (East)",
                zones: [
                    { code: "RY", name: "ระยอง" },
                    { code: "CB", name: "ชลบุรี" }
                ]
            },
            {
                region: "อีสาน (Northeast)",
                zones: [
                    { code: "KK", name: "ขอนแก่น" },
                    { code: "SK", name: "สกลนคร" },
                    { code: "UB", name: "อุบลราชธานี" },
                    { code: "UD", name: "อุดรธานี" },
                    { code: "NR", name: "นครราชสีมา" }
                ]
            },
            {
                region: "ใต้ (South)",
                zones: [
                    { code: "SR", name: "สุราษฎร์ธานี" },
                    { code: "HY", name: "หาดใหญ่" },
                    { code: "PK", name: "ภูเก็ต" }
                ]
            }
        ];

        const defaultConfigs = [
            { key: 'DBD_FILE_FRESHNESS_DAYS', value: '180', type: 'number', category: 'System', desc: 'จำนวนวันสูงสุดที่ยอมรับได้สำหรับความใหม่ของไฟล์ DBD (Days)', label: 'อายุไฟล์ข้อมูล DBD (วัน)' },
            { key: 'AUDIT_LOG_RETENTION_DAYS', value: '14', type: 'number', category: 'System', desc: 'ระยะเวลาจัดเก็บไฟล์ Log ของระบบ (Days)', label: 'ระยะเวลาจัดเก็บประวัติระบบ (วัน)' },
            { key: 'MAX_FILE_UPLOAD_SIZE_MB', value: '50', type: 'number', category: 'System', desc: 'ขนาดไฟล์สูงสุดที่อนุญาตให้อัปโหลด (MB)', label: 'ขนาดไฟล์อัปโหลดสูงสุด (MB)' },
            { key: 'SYSTEM_MAINTENANCE_MODE', value: 'false', type: 'boolean', category: 'System', desc: 'เปิดโหมดปิดปรับปรุงระบบ', label: 'โหมดปิดปรับปรุงระบบ' },
            { key: 'DEFAULT_PAGE_SIZE', value: '20', type: 'number', category: 'System', desc: 'จำนวนรายการเริ่มต้นที่แสดงต่อหน้า', label: 'จำนวนรายการต่อหน้า (ค่าเริ่มต้น)' },
            { key: 'ENABLE_BATCH_PROCESSING', value: 'true', type: 'boolean', category: 'System', desc: 'เปิดใช้งานการประมวลผล Batch Automation', label: 'เปิดใช้งานระบบประมวลผลอัตโนมัติ (Batch)' },
            { key: 'COMMITTEE_APPROVAL_THRESHOLD_THB', value: '300000', type: 'number', category: 'System', desc: 'วงเงินที่ใช้แยกการอนุมัติระหว่างผู้อนุมัติระดับต้นและระดับสูง (บาท)', label: 'วงเงินพิจารณาโดยผู้อนุมัติระดับสูง (บาท)' },
            { key: 'RBAC_MATRIX_CONFIG', value: JSON.stringify(initialRbacMatrix), type: 'json', category: 'UserRoles', desc: 'การตั้งค่า Matrix การจัดการสิทธิ์', label: 'Role & Permission Matrix' },
                        { key: 'REGION_BRANCH_CONFIG', value: JSON.stringify(initialRegionBranchConfig), type: 'json', category: 'System', desc: 'การตั้งค่าสาขาตามพื้นที่', label: 'Region and Branch Configuration' },
            { key: 'WORKFLOW_CONFIG', value: JSON.stringify(initialWorkflowConfig), type: 'json', category: 'WorkflowMgmt', desc: 'การตั้งค่าสถานะ Workflow และการอนุมัติ', label: 'Workflow State Machine Configuration' }
        ];

        for (const config of defaultConfigs) {
            const checkConfigSQL = `SELECT * FROM Configurations WHERE config_key = @p0`;
            const checkConfigReq = pool.request();
            checkConfigReq.input('p0', sql.NVarChar, config.key);
            const checkConfigRes = await checkConfigReq.query(checkConfigSQL);

            if (checkConfigRes.recordset.length === 0) {
                const insertConfigSQL = `
                    INSERT INTO Configurations (config_key, config_value, data_type, category, description, label, updated_by)
                    VALUES (@k, @v, @t, @c, @d, @l, @u)
                `;
                const insertReq = pool.request();
                insertReq.input('k', sql.NVarChar, config.key);
                insertReq.input('v', sql.NVarChar, config.value);
                insertReq.input('t', sql.NVarChar, config.type);
                insertReq.input('c', sql.NVarChar, config.category);
                insertReq.input('d', sql.NVarChar, config.desc);
                insertReq.input('l', sql.NVarChar, config.label);
                insertReq.input('u', sql.NVarChar, 'system');
                await insertReq.query(insertConfigSQL);
                logger.info(`Seeded default configuration: ${config.key}`);
            } else {
                // Update label for existing seed data if it's missing
                const updateLabelSQL = `
                    UPDATE Configurations
                    SET label = @l
                    WHERE config_key = @k AND label IS NULL
                `;
                const updateReq = pool.request();
                updateReq.input('k', sql.NVarChar, config.key);
                updateReq.input('l', sql.NVarChar, config.label);
                await updateReq.query(updateLabelSQL);

                if (config.key === 'COMMITTEE_APPROVAL_THRESHOLD_THB') {
                    const updateCategorySQL = `
                        UPDATE Configurations
                        SET category = @c
                        WHERE config_key = @k AND ISNULL(category, '') <> @c
                    `;
                    const updateCategoryReq = pool.request();
                    updateCategoryReq.input('k', sql.NVarChar, config.key);
                    updateCategoryReq.input('c', sql.NVarChar, 'System');
                    await updateCategoryReq.query(updateCategorySQL);
                }

                // Force update RBAC matrix if it is missing the new roles or page permissions
                if (config.key === 'RBAC_MATRIX_CONFIG') {
                    try {
                        const currentVal = JSON.parse(checkConfigRes.recordset[0].config_value);

                        const migratedVal = migrateApprovalRoles(currentVal);
                        const needsMigration = JSON.stringify(migratedVal) !== JSON.stringify(currentVal);

                        if (!currentVal.permissions || !currentVal.permissions.find(p => p.key === 'manage_blacklist') || !currentVal.permissions.find(p => p.key === 'page:create-credit') || currentVal.permissions[0]?.key !== 'page:create-credit' || !currentVal.roles || !currentVal.roles.includes('ผู้พิจารณาของพื้นที่') || needsMigration) {
                            const updateMatrixSQL = `
                                UPDATE Configurations
                                SET config_value = @v
                                WHERE config_key = @k
                            `;
                            const updateMatrixReq = pool.request();
                            updateMatrixReq.input('k', sql.NVarChar, config.key);
                            updateMatrixReq.input('v', sql.NVarChar, JSON.stringify(migratedVal));
                            await updateMatrixReq.query(updateMatrixSQL);
                            logger.info('Updated RBAC_MATRIX_CONFIG with new roles structure and page permissions.');
                        }
                    } catch(e) {
                        logger.error('Error migrating RBAC matrix config:', e);
                    }
                }

                if (config.key === 'WORKFLOW_CONFIG') {
                    try {
                        const currentVal = JSON.parse(checkConfigRes.recordset[0].config_value);
                        const migratedVal = migrateWorkflowApprovalRoles(currentVal);
                        if (JSON.stringify(migratedVal) !== JSON.stringify(currentVal)) {
                            const updateWorkflowSQL = `
                                UPDATE Configurations
                                SET config_value = @v
                                WHERE config_key = @k
                            `;
                            const updateWorkflowReq = pool.request();
                            updateWorkflowReq.input('k', sql.NVarChar, config.key);
                            updateWorkflowReq.input('v', sql.NVarChar, JSON.stringify(migratedVal));
                            await updateWorkflowReq.query(updateWorkflowSQL);
                            logger.info('Updated WORKFLOW_CONFIG with normalized approval role names.');
                        }
                    } catch(e) {
                        logger.error('Error migrating WORKFLOW_CONFIG roles:', e);
                    }
                }
            }
        }

        logger.info('Database initialized (MSSQL).');
    } catch (error) {
        logger.error('Database initialization failed (MSSQL):', error);
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

        // Auto-translate LIMIT syntax for MSSQL compatibility
        const limitMatch = mssqlQuery.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            const limitVal = limitMatch[1];
            mssqlQuery = mssqlQuery.replace(/LIMIT\s+\d+/i, '');
            if (/ORDER\s+BY/i.test(mssqlQuery)) {
                mssqlQuery += ` OFFSET 0 ROWS FETCH NEXT ${limitVal} ROWS ONLY`;
            } else {
                mssqlQuery = mssqlQuery.replace(/SELECT\s+/i, `SELECT TOP ${limitVal} `);
            }
        }

        try {
            const result = await request.query(mssqlQuery);
            // Normalize output to match { rows: [...] }
            return { rows: result.recordset };
        } catch (err) {
            logger.error('Query error:', err);
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

        // Auto-translate LIMIT syntax for MSSQL compatibility
        const limitMatch = mssqlQuery.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            const limitVal = limitMatch[1];
            mssqlQuery = mssqlQuery.replace(/LIMIT\s+\d+/i, '');
            if (/ORDER\s+BY/i.test(mssqlQuery)) {
                mssqlQuery += ` OFFSET 0 ROWS FETCH NEXT ${limitVal} ROWS ONLY`;
            } else {
                mssqlQuery = mssqlQuery.replace(/SELECT\s+/i, `SELECT TOP ${limitVal} `);
            }
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
            logger.error('RunAsync error:', err);
            throw err;
        }
    }
};

module.exports = db;
