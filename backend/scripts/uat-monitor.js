const http = require('http');
const db = require('../db');

// Configuration
const API_URL = 'http://localhost:3000/api/health';
const REFRESH_INTERVAL = 5000; // 5 seconds

// ANSI Color Codes
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    white: "\x1b[37m"
};

const printHeader = () => {
    console.clear();
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}      UAT MONITORING DASHBOARD          ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log('----------------------------------------');
};

const checkHealth = () => {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.get(API_URL, (res) => {
            const duration = Date.now() - start;
            if (res.statusCode === 200) {
                resolve(`${colors.green}ONLINE (Ping: ${duration}ms)${colors.reset}`);
            } else {
                resolve(`${colors.red}ERROR (Status: ${res.statusCode})${colors.reset}`);
            }
        });

        req.on('error', (err) => {
            resolve(`${colors.red}OFFLINE (Connection Refused)${colors.reset}`);
        });

        req.end();
    });
};

const getDbStats = async () => {
    try {
        // Customer Count
        let customerSql = 'SELECT COUNT(*) as count FROM Customers';
        const { rows: customerRows } = await db.query(customerSql);
        const customerCount = customerRows[0].count;

        // Credit Request Count
        let requestSql = 'SELECT COUNT(*) as count FROM CreditRequests';
        const { rows: requestRows } = await db.query(requestSql);
        const requestCount = requestRows[0].count;

        // Latest Request
        let latestSql;
        if (db.dbType === 'mssql') {
             latestSql = 'SELECT TOP 1 * FROM CreditRequests ORDER BY created_at DESC';
        } else {
             latestSql = 'SELECT * FROM CreditRequests ORDER BY created_at DESC LIMIT 1';
        }
        const { rows: latestRows } = await db.query(latestSql);
        const latestRequest = latestRows.length > 0 ? latestRows[0] : null;

        return {
            customerCount,
            requestCount,
            latestRequest
        };
    } catch (error) {
        return { error: error.message };
    }
};

const runMonitor = async () => {
    // Initialize DB Connection
    console.log('Connecting to database...');
    try {
        await db.initialize();
    } catch (e) {
        console.error('Failed to connect to DB:', e);
        process.exit(1);
    }

    const loop = async () => {
        const healthStatus = await checkHealth();
        const dbStats = await getDbStats();

        printHeader();
        console.log(`Server Status: ${healthStatus}`);
        console.log('----------------------------------------');

        if (dbStats.error) {
            console.log(`${colors.red}Database Error: ${dbStats.error}${colors.reset}`);
        } else {
            console.log(`${colors.bright}Data Statistics:${colors.reset}`);
            console.log(`  Total Customers:      ${colors.yellow}${dbStats.customerCount}${colors.reset}`);
            console.log(`  Total Credit Requests: ${colors.yellow}${dbStats.requestCount}${colors.reset}`);
            console.log('----------------------------------------');
            console.log(`${colors.bright}Latest Credit Request:${colors.reset}`);
            if (dbStats.latestRequest) {
                const req = dbStats.latestRequest;
                console.log(`  Tx ID:     ${colors.green}${req.tx_id}${colors.reset}`);
                console.log(`  Customer:  ${req.customer_name} (${req.customer_no})`);
                console.log(`  Status:    ${req.status}`);
                console.log(`  Amount:    ${parseFloat(req.request_amount).toLocaleString()}`);
                console.log(`  Created:   ${new Date(req.created_at).toLocaleString()}`);
            } else {
                console.log(`  ${colors.dim}No requests found.${colors.reset}`);
            }
        }
        console.log('----------------------------------------');
        console.log(`${colors.dim}Press Ctrl+C to exit${colors.reset}`);

        setTimeout(loop, REFRESH_INTERVAL);
    };

    loop();
};

runMonitor();
