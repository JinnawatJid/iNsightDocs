require('dotenv').config({ path: '../.env' }); // Try root .env
require('dotenv').config({ path: '.env' }); // Try local .env

const axios = require('axios');
const path = require('path');

// Configuration
const API_URL = "http://192.192.0.37:8280/customer-late-payment/1.0.0";
// Replace with your actual key or set CUSTOMER_API_KEY env var
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY_HERE";
const CUSTOMER_NO = "08015AY"; // The customer ID mentioned in the error

async function testLatePaymentAPI() {
    console.log(`Testing Late Payment API: ${API_URL}`);
    console.log(`Using Customer No: ${CUSTOMER_NO}`);

    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
        console.error("❌ ERROR: CUSTOMER_API_KEY is not set. Please set it in .env or environment variables.");
        process.exit(1);
    }

    console.log(`Using API Key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}`);

    // Test Case 1: Standard 'apikey' header (as per current code)
    await tryRequest('apikey', API_KEY);

    // Test Case 2: 'ApiKey' (CamelCase)
    await tryRequest('ApiKey', API_KEY);

    // Test Case 3: 'APIKEY' (UPPERCASE)
    await tryRequest('APIKEY', API_KEY);

    // Test Case 4: 'x-api-key' (Standard)
    await tryRequest('x-api-key', API_KEY);

    // Test Case 5: 'X-API-KEY' (Standard Upper)
    await tryRequest('X-API-KEY', API_KEY);
}

async function tryRequest(headerName, headerValue) {
    console.log(`\n--- Testing Header: ${headerName} ---`);
    try {
        const headers = {
            "Content-Type": "application/json"
        };
        headers[headerName] = headerValue;

        const response = await axios.post(API_URL, {
            "Customer No_": CUSTOMER_NO
        }, {
            headers: headers,
            timeout: 5000
        });

        console.log(`✅ Success! Status: ${response.status}`);
        console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
        console.log(`❌ Failed. Status: ${error.response ? error.response.status : 'Unknown'}`);
        if (error.response) {
            // console.log('Response Data:', JSON.stringify(error.response.data));
            console.log('Response Status Text:', error.response.statusText);
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testLatePaymentAPI();
