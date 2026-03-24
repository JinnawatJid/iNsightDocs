const logger = require('../utils/logger');
const http = require('http');
const express = require('express');
const axios = require('axios');
const path = require('path');

// 1. Mock DB by hijacking the require
const db = require('../db');
// Override the query method
db.query = async (sql, params) => {
    logger.info(`[MockDB] Query executed: ${sql.substring(0, 50)}...`);
    // Return mock data based on SQL content or just generic data
    if (sql.includes('Customers')) {
        return {
            rows: [{
                "No_": "DB_CUST_001",
                "Name": "Fallback Customer DB",
                "Mobile Phone No_": "0899999999",
                "Address": "123 Local Rd",
                "City": "Bangkok",
                "County": "Bangkok",
                "Post Code": "10110",
                "VAT Registration No_": "1234567890123"
            }]
        };
    }
    // Return empty for others (History/Financials)
    return { rows: [] };
};
db.dbType = 'sqlite'; // Force sqlite path

// 2. Setup Env Var BEFORE requiring controller
const MOCK_API_PORT = 8281;
const API_PATH = '/customer-sp682/1.0.0';
process.env.CUSTOMER_API_URL = `http://127.0.0.1:${MOCK_API_PORT}${API_PATH}`;

// 3. Import Controller (it will use the mocked db)
const customerController = require('../controllers/customerController');

const app = express();
app.use(express.json());
app.get('/api/customers/search', customerController.searchCustomers);

// 3. Setup Mock External API Server
const mockApiServer = http.createServer((req, res) => {
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const bodyStr = Buffer.concat(body).toString();
    logger.info(`[MockAPI] Request: ${req.url}`);

    if (req.url === API_PATH && req.method === 'POST') {
        const payload = JSON.parse(bodyStr);
        const payloadStr = JSON.stringify(payload);

        // CASE: Fail (If any field contains FAIL_API)
        if (payloadStr.includes('FAIL_API')) {
            logger.info('[MockAPI] Simulating 500 Error');
            res.writeHead(500);
            res.end('Mock Server Error');
            return;
        }

        // CASE: Empty
        if (payload.Name && payload.Name['$like'].includes('EMPTY')) {
            logger.info('[MockAPI] Returning Empty List');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "success", data: [] }));
            return;
        }

        // CASE: Success
        logger.info('[MockAPI] Returning Success Data');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: "success",
            data: [{
                "No_": "API_CUST_001",
                "Name": "API Customer Success",
                "Mobile Phone No_": "0811111111"
            }]
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
  });
});

// Run Tests
async function run() {
    logger.info('--- Starting Search Verification ---');

    // Start Mock API
    await new Promise(resolve => mockApiServer.listen(MOCK_API_PORT, '127.0.0.1', resolve));
    process.env.CUSTOMER_API_URL = `http://127.0.0.1:${MOCK_API_PORT}${API_PATH}`;
    logger.info(`Mock API running on ${process.env.CUSTOMER_API_URL}`);

    // Start Local Express App
    const localServer = app.listen(3002, '127.0.0.1', () => {});
    const localUrl = 'http://127.0.0.1:3002/api/customers/search';

    try {
        // Test 1: Success
        logger.info('\n[TEST 1] Standard API Success');
        const res1 = await axios.get(localUrl, { params: { q: 'SUCCESS' } });
        if (res1.data.length === 1 && res1.data[0]._source === 'api') {
            logger.info('✅ PASS: Source is API');
        } else {
            logger.error('❌ FAIL: ', res1.data);
        }

        // Test 2: Fallback
        logger.info('\n[TEST 2] API Failure -> DB Fallback');
        const res2 = await axios.get(localUrl, { params: { q: 'FAIL_API' } });
        if (res2.data.length > 0 && res2.data[0]._source === 'database') {
            logger.info('✅ PASS: Source is Database');
            logger.info('   Data:', res2.data[0].customer.name);
        } else {
            logger.error('❌ FAIL: ', res2.data);
        }

    } catch (e) {
        logger.error('Test Error:', e.message);
        if (e.response) logger.error(e.response.data);
    } finally {
        mockApiServer.close();
        localServer.close();
        // db close if needed
    }
}

run();
