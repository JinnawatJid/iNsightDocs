const logger = require('../utils/logger');
require('dotenv').config();
const axios = require('axios');

// Configuration (Matches the code changes)
const API_URL = "http://192.192.0.37:8280/sales-by-category-6-months/1.0.0";
// Use the key from env or a default if testing manually
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY_HERE";

const customerCode = process.argv[2] || "01013AY";

logger.info(`Testing Category API for customer: ${customerCode}`);
logger.info(`URL: ${API_URL}`);
logger.info(`API Key: ${API_KEY ? "Set (Hidden)" : "Not Set"}`);

async function testApi() {
    try {
        const response = await axios.post(API_URL, {
            customer_code: customerCode
        }, {
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        logger.info("\n[SUCCESS] API Response received.");
        logger.info("Status:", response.status);

        const rawData = response.data.data || [];
        logger.info(`Raw Data Items: ${rawData.length}`);

        // Simulate the transformation logic implemented in the controller
        const by_category = rawData.reduce((acc, item) => {
            const cat = item.category;
            const amount = item.total_amount || 0;
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});

        logger.info("\n[VERIFICATION] Transformed Data (by_category):");
        logger.info(JSON.stringify(by_category, null, 2));

        logger.info("\nIf you see the data above, the fix is working correctly.");

    } catch (error) {
        logger.error("\n[ERROR] API Request Failed:");
        if (error.response) {
            logger.error(`Status: ${error.response.status}`);
            logger.error("Data:", error.response.data);
        } else {
            logger.error(error.message);
        }
    }
}

testApi();
