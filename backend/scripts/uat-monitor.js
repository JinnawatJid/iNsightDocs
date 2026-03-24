const logger = require('../utils/logger');
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
    logger.info(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
    logger.info(`${colors.bright}${colors.cyan}      UAT MONITORING DASHBOARD          ${colors.reset}`);
    logger.info(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
    logger.info(`Time: ${new Date().toLocaleTimeString()}`);
    logger.info('----------------------------------------');
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
    logger.info('Connecting to database...');
    try {
        await db.initialize();
    } catch (e) {
        logger.error('Failed to connect to DB:', e);
        process.exit(1);
    }

    const loop = async () => {
        const healthStatus = await checkHealth();
        const dbStats = await getDbStats();

        printHeader();
        logger.info(`Server Status: ${healthStatus}`);
        logger.info('----------------------------------------');

        if (dbStats.error) {
            logger.info(`${colors.red}Database Error: ${dbStats.error}${colors.reset}`);
        } else {
            logger.info(`${colors.bright}Data Statistics:${colors.reset}`);
            logger.info(`  Total Customers:      ${colors.yellow}${dbStats.customerCount}${colors.reset}`);
            logger.info(`  Total Credit Requests: ${colors.yellow}${dbStats.requestCount}${colors.reset}`);
            logger.info('----------------------------------------');
            logger.info(`${colors.bright}Latest Credit Request:${colors.reset}`);
            if (dbStats.latestRequest) {
                const req = dbStats.latestRequest;
                logger.info(`  Tx ID:     ${colors.green}${req.tx_id}${colors.reset}`);
                logger.info(`  Customer:  ${req.customer_name} (${req.customer_no})`);
                logger.info(`  Status:    ${req.status}`);
                logger.info(`  Amount:    ${parseFloat(req.request_amount).toLocaleString()}`);
                logger.info(`  Created:   ${new Date(req.created_at).toLocaleString()}`);
            } else {
                logger.info(`  ${colors.dim}No requests found.${colors.reset}`);
            }
        }
        logger.info('----------------------------------------');
        logger.info(`${colors.dim}Press Ctrl+C to exit${colors.reset}`);

        setTimeout(loop, REFRESH_INTERVAL);
    };

    loop();
};

runMonitor();
