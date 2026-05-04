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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            updated_by TEXT
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
            { name: 'updated_at', type: 'DATETIME' },
            { name: 'created_by', type: 'TEXT' },
            { name: 'updated_by', type: 'TEXT' }
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);

        // Ensure new columns exist in CreditRequestAttachments table (for existing DBs)
        const attachmentColumns = [
            { name: 'uploaded_by', type: 'TEXT' },
            { name: 'is_deleted', type: 'INTEGER DEFAULT 0' },
            { name: 'updated_by', type: 'TEXT' }
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


        // Create CustomerDocuments table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS CustomerDocuments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_no TEXT,
            file_type TEXT,
            file_path TEXT,
            original_name TEXT,
            uploaded_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create RequestComments table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS RequestComments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            actor_role TEXT,
            comment_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            username TEXT,
            FOREIGN KEY(tx_id) REFERENCES CreditRequests(tx_id)
        )`);


        // Ensure username column exists in RequestComments table (for existing DBs)
        try {
            await db.runAsync(`ALTER TABLE RequestComments ADD COLUMN username TEXT`);
            logger.info(`Added column username to RequestComments`);
        } catch (err) {
             if (!err.message.includes('duplicate column name')) {
                 logger.error(`Error adding column username to RequestComments:`, err);
            }
        }

        // Migration: Update 3-digit tx_id to 2-digit tx_id (e.g., 00TRCA2603/001 -> 00TRCA2603/01)
        try {
            const { rows: txs } = await db.query(`SELECT tx_id FROM CreditRequests WHERE tx_id LIKE '%/%'`);
            if (txs && txs.length > 0) {
                const customersDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'customers');
                for (const tx of txs) {
                    try {
                        const txId = tx.tx_id;
                        const parts = txId.split('/');
                        const runningNum = parseInt(parts[1], 10);
                        if (parts.length === 2 && parts[1].length === 3 && !isNaN(runningNum) && runningNum <= 99) {
                            const newTxId = `${parts[0]}/${runningNum.toString().padStart(2, '0')}`;

                            // In SQLite, PRAGMA foreign_keys is OFF by default unless explicitly enabled.
                            // However, doing parent first is standard.
                            await db.runAsync(`UPDATE CreditRequests SET tx_id = ? WHERE tx_id = ?`, [newTxId, txId]);

                            // Update tx_id and replace the old folder name in the file_path for attachments
                            const oldFolderName = txId.replace(/\//g, '_');
                            const newFolderName = newTxId.replace(/\//g, '_');
                            await db.runAsync(`UPDATE CreditRequestAttachments SET tx_id = ?, file_path = REPLACE(file_path, ?, ?) WHERE tx_id = ?`, [newTxId, oldFolderName, newFolderName, txId]);

                            await db.runAsync(`UPDATE RequestComments SET tx_id = ? WHERE tx_id = ?`, [newTxId, txId]);

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
                         logger.error(`Error migrating single tx_id ${tx.tx_id}:`, innerErr);
                    }
                }
            }
        } catch (e) {
            logger.error('Error migrating 3-digit tx_id to 2-digit tx_id:', e);
        }

        // Create Configurations table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS Configurations (
            config_key TEXT PRIMARY KEY,
            config_value TEXT,
            data_type TEXT,
            category TEXT,
            description TEXT,
            label TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
        )`);

        // Create Notifications table
        await db.runAsync(`CREATE TABLE IF NOT EXISTS Notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT,
            target_role TEXT,
            target_username TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            read_by TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Ensure new column exists in Configurations table (for existing DBs)
        try {
            await db.runAsync(`ALTER TABLE Configurations ADD COLUMN label TEXT`);
            logger.info(`Added column label to Configurations`);
        } catch (err) {
             if (!err.message.includes('duplicate column name')) {
                 logger.error(`Error adding column label to Configurations:`, err);
            }
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
                    actionableByRoles: ["ผู้อนุมัติ (วงเงิน <300K)"],
                    allowedTransitions: ["Approved", "Reviewed", "Rejected"]
                },
                Reviewed: {
                    label: "รอคณะกรรมการพิจารณา",
                    type: "active",
                    actionableByRoles: ["ผู้อนุมัติ (วงเงิน > 300K)"],
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
                'ผู้อนุมัติ (วงเงิน <300K)',
                'ผู้อนุมัติ (วงเงิน > 300K)',
                'ผู้ดูแลระบบ'
            ],
            permissions: [
                { key: 'create_request', label: 'สร้างคำขอสินเชื่อ' },
                { key: 'approve_credit_low', label: 'อนุมัติวงเงินต่ำกว่าเกณฑ์' },
                { key: 'approve_credit_high', label: 'อนุมัติวงเงินสูงกว่าเกณฑ์' },
                { key: 'manage_blacklist', label: 'จัดการรายการ NPL (Blacklist)' },
                { key: 'page:create-credit', label: 'เข้าถึงหน้า: สร้างคำขอ / ค้นหาลูกค้า' },
                { key: 'page:pending-requests', label: 'เข้าถึงหน้า: คำขอทั้งหมด' },
                { key: 'page:batch-automation', label: 'เข้าถึงหน้า: ระบบอัตโนมัติ' },
                { key: 'page:system-configuration', label: 'เข้าถึงหน้า: ตั้งค่าระบบ' }
            ],
            matrix: {
                'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)': ['create_request', 'page:create-credit', 'page:pending-requests'],
                'ผู้พิจารณาของพื้นที่': ['page:create-credit', 'page:pending-requests'],
                'ผู้พิจารณาฝ่ายขาย': ['page:create-credit', 'page:pending-requests'],
                'ผู้ตรวจสอบเอกสาร': ['page:create-credit', 'page:pending-requests', 'page:batch-automation'],
                'ผู้อนุมัติ (วงเงิน <300K)': ['approve_credit_low', 'page:create-credit', 'page:pending-requests'],
                'ผู้อนุมัติ (วงเงิน > 300K)': ['approve_credit_high', 'page:create-credit', 'page:pending-requests'],
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
            { key: 'COMMITTEE_APPROVAL_THRESHOLD_THB', value: '300000', type: 'number', category: 'Workflow', desc: 'วงเงินที่ต้องได้รับการอนุมัติจากคณะกรรมการ (บาท)', label: 'วงเงินพิจารณาโดยคณะกรรมการ (บาท)' },
            { key: 'RBAC_MATRIX_CONFIG', value: JSON.stringify(initialRbacMatrix), type: 'json', category: 'UserRoles', desc: 'การตั้งค่า Matrix การจัดการสิทธิ์', label: 'Role & Permission Matrix' },
                        { key: 'REGION_BRANCH_CONFIG', value: JSON.stringify(initialRegionBranchConfig), type: 'json', category: 'System', desc: 'การตั้งค่าสาขาตามพื้นที่', label: 'Region and Branch Configuration' },
            { key: 'WORKFLOW_CONFIG', value: JSON.stringify(initialWorkflowConfig), type: 'json', category: 'WorkflowMgmt', desc: 'การตั้งค่าสถานะ Workflow และการอนุมัติ', label: 'Workflow State Machine Configuration' }
        ];

        for (const config of defaultConfigs) {
            const checkConfig = await db.query(`SELECT * FROM Configurations WHERE config_key = ?`, [config.key]);
            if (checkConfig && checkConfig.rows && checkConfig.rows.length === 0) {
                await db.runAsync(`INSERT INTO Configurations (config_key, config_value, data_type, category, description, label, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [config.key, config.value, config.type, config.category, config.desc, config.label, 'system']);
                logger.info(`Seeded default configuration: ${config.key}`);
            } else {
                // Update label for existing seed data if it's missing
                await db.runAsync(`UPDATE Configurations SET label = ? WHERE config_key = ? AND label IS NULL`,
                    [config.label, config.key]);

                // Force update RBAC matrix if it is missing the new roles
                if (config.key === 'RBAC_MATRIX_CONFIG') {
                    try {
                        const currentVal = JSON.parse(checkConfig.rows[0].config_value);

                        if (!currentVal.permissions || !currentVal.permissions.find(p => p.key === 'manage_blacklist') || !currentVal.roles || !currentVal.roles.includes('ผู้พิจารณาของพื้นที่')) {
                            await db.runAsync(`UPDATE Configurations SET config_value = ? WHERE config_key = ?`,
                                [config.value, config.key]);
                            logger.info('Updated RBAC_MATRIX_CONFIG with new roles structure.');
                        }
                    } catch(e) {
                        logger.error('Error migrating RBAC matrix config:', e);
                    }
                }
            }
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
