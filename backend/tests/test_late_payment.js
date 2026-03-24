const logger = require('../utils/logger');
const axios = require('axios');
const { calculateSlope, calculateTrendRatio, generateContinuousTimeline } = require('../services/financialCalculator');
const db = require('../db');

// Mock data from the user's example
const SAMPLE_LATE_PAYMENT_DATA = [
    {
        "Invoice_No": "AYVR-67/03197",
        "Invoice_Date": "2024-05-31T00:00:00.000Z",
        "Due Date": "2024-06-15T00:00:00.000Z",
        "Customer No_": "04003AY",
        "Payment_Doc_No": "AYPRV-67/0007",
        "Payment_Date": "2024-06-05T00:00:00.000Z",
        "Check Date": null,
        "Check Status": null,
        "Cleared Date": null,
        "Effective_Payment_Date": "2024-06-05T00:00:00.000Z",
        "Status": "ON-TIME",
        "Late_Days": 0
    },
    {
        "Invoice_No": "AYVR-67/03200",
        "Late_Days": 5
    },
    {
        "Invoice_No": "AYVR-67/03205",
        "Late_Days": 10
    }
];

// Helper Function Logic (Exact copy from financialController.js to test logic)
const simulateFetchLatePaymentData = async (mockData) => {
    // Simulate API Call returning mockData
    const data = mockData;

    // Check if data is array (direct list) or object with data property
    const invoices = Array.isArray(data) ? data : (data.data || []);

    if (!invoices || invoices.length === 0) {
         return { average_late_days: 0, total_invoices: 0, late_count: 0 };
    }

    let totalLateDays = 0;
    let lateCount = 0;

    invoices.forEach(inv => {
        const lateDays = Number(inv.Late_Days) || 0;
        totalLateDays += lateDays;
        if (lateDays > 0) lateCount++;
    });

    const avg = totalLateDays / invoices.length;

    return {
        average_late_days: Number(avg.toFixed(2)),
        total_invoices: invoices.length,
        late_count: lateCount
    };
};

async function runTest() {
    logger.info("--- Testing Late Payment Logic ---");

    // Test Case 1: Mixed Data (0, 5, 10) -> Total 15 / 3 = 5.00
    const res1 = await simulateFetchLatePaymentData(SAMPLE_LATE_PAYMENT_DATA);
    logger.info("Test Case 1 (Expected Avg 5.00):", res1);
    if (res1.average_late_days === 5.00 && res1.total_invoices === 3 && res1.late_count === 2) {
        logger.info("✅ Passed");
    } else {
        logger.error("❌ Failed");
    }

    // Test Case 2: Empty Data
    const res2 = await simulateFetchLatePaymentData([]);
    logger.info("Test Case 2 (Expected Avg 0):", res2);
    if (res2.average_late_days === 0 && res2.total_invoices === 0) {
        logger.info("✅ Passed");
    } else {
        logger.error("❌ Failed");
    }

    // Test Case 3: All On-Time
    const onTimeData = [{ Late_Days: 0 }, { Late_Days: 0 }];
    const res3 = await simulateFetchLatePaymentData(onTimeData);
    logger.info("Test Case 3 (Expected Avg 0.00):", res3);
    if (res3.average_late_days === 0 && res3.late_count === 0) {
        logger.info("✅ Passed");
    } else {
        logger.error("❌ Failed");
    }

    logger.info("--- End Test ---");
}

runTest();
