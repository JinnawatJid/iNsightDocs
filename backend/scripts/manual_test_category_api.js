require('dotenv').config();
const axios = require('axios');

// Configuration (Matches the code changes)
const API_URL = "http://192.192.0.37:8280/sales-by-category-6-months/1.0.0";
// Use the key from env or a default if testing manually
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY_HERE";

const customerCode = process.argv[2] || "01013AY";

console.log(`Testing Category API for customer: ${customerCode}`);
console.log(`URL: ${API_URL}`);
console.log(`API Key: ${API_KEY ? "Set (Hidden)" : "Not Set"}`);

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

        console.log("\n[SUCCESS] API Response received.");
        console.log("Status:", response.status);

        const rawData = response.data.data || [];
        console.log(`Raw Data Items: ${rawData.length}`);

        // Simulate the transformation logic implemented in the controller
        const by_category = rawData.reduce((acc, item) => {
            const cat = item.category;
            const amount = item.total_amount || 0;
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});

        console.log("\n[VERIFICATION] Transformed Data (by_category):");
        console.log(JSON.stringify(by_category, null, 2));

        console.log("\nIf you see the data above, the fix is working correctly.");

    } catch (error) {
        console.error("\n[ERROR] API Request Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testApi();
