const sql = require('mssql');
const path = require('path');
require('dotenv').config();

// Configuration for SA (System Administrator)
const SA_CONFIG = {
    user: process.env.SA_USER || 'sa',
    password: process.env.SA_PASSWORD, // Must be provided via environment variable
    server: process.env.DB_SERVER || '192.192.0.220',
    port: parseInt(process.env.DB_PORT) || 50682,
    database: 'master',      // Connect to master to create DBs/Logins
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

if (!SA_CONFIG.password) {
    console.error('Error: SA_PASSWORD environment variable is required.');
    console.error('Usage: SA_PASSWORD=your_password node verify_mssql.js');
    process.exit(1);
}

const NEW_DB_NAME = 'SP682';
const NEW_USER = 'SP682';
const NEW_PASSWORD = 'SP682';

async function main() {
    console.log('--- Starting MSSQL Verification ---');

    let pool = null;

    try {
        // Step 1: Connect as SA to 'master'
        console.log(`Connecting to ${SA_CONFIG.server}:${SA_CONFIG.port} as ${SA_CONFIG.user}...`);
        pool = await sql.connect(SA_CONFIG);
        console.log('Connected to MSSQL successfully.');

        // Step 2: Create Database if not exists
        console.log(`Checking database '${NEW_DB_NAME}'...`);
        const dbCheck = await pool.request().query(`SELECT name FROM sys.databases WHERE name = '${NEW_DB_NAME}'`);
        if (dbCheck.recordset.length === 0) {
            console.log(`Database '${NEW_DB_NAME}' does not exist. Creating...`);
            await pool.request().query(`CREATE DATABASE ${NEW_DB_NAME}`);
            console.log(`Database '${NEW_DB_NAME}' created.`);
        } else {
            console.log(`Database '${NEW_DB_NAME}' already exists.`);
        }

        // Step 3: Create Login if not exists (Server Level)
        console.log(`Checking login '${NEW_USER}'...`);
        const loginCheck = await pool.request().query(`SELECT name FROM sys.server_principals WHERE name = '${NEW_USER}'`);
        if (loginCheck.recordset.length === 0) {
            console.log(`Login '${NEW_USER}' does not exist. Creating...`);
            // Note: In real scenarios, use parameterized or sanitized inputs. Here strictly for verification script.
            await pool.request().query(`CREATE LOGIN ${NEW_USER} WITH PASSWORD = '${NEW_PASSWORD}', CHECK_POLICY = OFF`);
            console.log(`Login '${NEW_USER}' created.`);
        } else {
            console.log(`Login '${NEW_USER}' already exists.`);
        }

        // Step 4: Create User in the specific DB and assign roles (Database Level)
        console.log(`Switching context to '${NEW_DB_NAME}' to manage users...`);
        // We cannot USE database in Azure/some configs easily inside one connection if we pooled to master.
        // But for standard SQL Server, USE works.
        // Alternatively, create a new connection to the target DB.

        await pool.close();

        const dbConfig = { ...SA_CONFIG, database: NEW_DB_NAME };
        pool = await sql.connect(dbConfig);
        console.log(`Connected to '${NEW_DB_NAME}' as SA.`);

        console.log(`Checking user '${NEW_USER}' in database '${NEW_DB_NAME}'...`);
        const userCheck = await pool.request().query(`SELECT name FROM sys.database_principals WHERE name = '${NEW_USER}'`);
        if (userCheck.recordset.length === 0) {
            console.log(`User '${NEW_USER}' does not exist in DB. Creating...`);
            await pool.request().query(`CREATE USER ${NEW_USER} FOR LOGIN ${NEW_USER}`);
            console.log(`User '${NEW_USER}' created.`);

            // Assign db_owner role
            await pool.request().query(`ALTER ROLE db_owner ADD MEMBER ${NEW_USER}`);
            console.log(`User '${NEW_USER}' added to db_owner role.`);
        } else {
            console.log(`User '${NEW_USER}' already exists in DB.`);
            // Fix "Orphaned User" issue if SIDs don't match (common when recreating Logins)
            console.log(`Attempting to re-link user '${NEW_USER}' to login '${NEW_USER}' (Fix Orphaned User)...`);
            try {
                await pool.request().query(`ALTER USER ${NEW_USER} WITH LOGIN = ${NEW_USER}`);
                console.log(`User '${NEW_USER}' successfully re-linked to login.`);
            } catch (relinkErr) {
                console.error(`Warning: Failed to re-link user. It might already be correct. Error: ${relinkErr.message}`);
            }
        }

        await pool.close();
        console.log('--- Admin Setup Complete ---');

        // Step 5: Verify App Logic (Simulate Application Startup)
        console.log('\n--- Verifying Application Logic with New User ---');

        // Set environment variables for db-mssql.js
        process.env.DB_TYPE = 'mssql';
        process.env.DB_SERVER = SA_CONFIG.server;
        process.env.DB_PORT = SA_CONFIG.port.toString();
        process.env.DB_NAME = NEW_DB_NAME;
        process.env.DB_USER = NEW_USER;
        process.env.DB_PASSWORD = NEW_PASSWORD;

        console.log(`Initializing database module with user '${NEW_USER}'...`);
        // We need to clear the require cache for db-mssql.js if it was loaded (it wasn't in this process, but good practice)
        // require('../db-mssql.js') will read the NEW process.env values.

        const db = require('../db-mssql');

        console.log('Running initDB()...');
        await db.initialize();

        // Verify Tables exist
        console.log('Verifying table existence...');
        const requiredTables = ['Customers', 'AY_ACCUM', 'CreditRequests', 'CreditRequestAttachments', 'RequestComments'];

        for (const table of requiredTables) {
             const check = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
             // If query succeeds, table exists.
             console.log(`[OK] Table '${table}' exists. Row count: ${check.rows[0].count}`);
        }

        // Verify Insert Permission (e.g. RequestComments)
        console.log('Verifying Write Permission (INSERT into RequestComments)...');
        const testComment = {
            tx_id: 'VERIFY_TEST',
            actor_role: 'System',
            comment_text: 'Verification Script Test'
        };

        await db.runAsync(
            `INSERT INTO RequestComments (tx_id, actor_role, comment_text) VALUES (?, ?, ?)`,
            [testComment.tx_id, testComment.actor_role, testComment.comment_text]
        );
        console.log('[OK] Insert successful.');

        // Clean up test data
        await db.query(`DELETE FROM RequestComments WHERE tx_id = 'VERIFY_TEST'`);
        console.log('[OK] Cleanup successful.');

        console.log('\n--- MSSQL Verification PASSED Successfully ---');

    } catch (err) {
        console.error('\n!!! VERIFICATION FAILED !!!');
        console.error(err);
        process.exit(1);
    } finally {
        if (pool) {
            try { await pool.close(); } catch(e) {}
        }
        // db-mssql.js uses a global pool variable but doesn't export a close method.
        // The process exit will handle it.
        process.exit(0);
    }
}

main();
