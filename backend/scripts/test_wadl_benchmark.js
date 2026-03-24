const logger = require('../utils/logger');
/**
 * Test Script for WADL Logic Verification
 * Usage: node backend/scripts/test_wadl_benchmark.js
 *
 * This script tests the core calculation logic of Weighted Average Days Late (WADL)
 * by directly invoking the exported helper function `calculateWADL`.
 */

const { calculateWADL } = require('../controllers/financialController');

// --- Test Data Setup ---
// Scenario:
// 5 small invoices paid LATE (15 days) -> High Count Impact
// 1 large invoice paid ON TIME (0 days) -> High Value Impact (Should lower WADL)

const today = new Date();
const mockInvoices = [];

// 5 Small Late Invoices (Amount: 2000, Late: 15 days)
for(let i=0; i<5; i++) {
     const postDate = new Date(today);
     postDate.setMonth(postDate.getMonth() - (i+1));

     mockInvoices.push({
         Invoice_No: `INV-SMALL-${i}`,
         Posting_Date: postDate.toISOString(),
         Due_Date: postDate.toISOString(),
         Effective_Payment_Date: new Date(postDate.getTime() + (15 * 86400000)).toISOString(), // 15 days late
         Late_Days: 15,
         Status: 'LATE',
         Amount: 2000
     });
}

// 1 Large On-Time Invoice (Amount: 100,000, Late: 0 days)
const largeDate = new Date(today);
largeDate.setMonth(largeDate.getMonth() - 2);
mockInvoices.push({
     Invoice_No: `INV-LARGE-1`,
     Posting_Date: largeDate.toISOString(),
     Due_Date: largeDate.toISOString(),
     Effective_Payment_Date: largeDate.toISOString(), // On Time
     Late_Days: 0,
     Status: 'ON-TIME',
     Amount: 100000
});

// --- EXECUTE TEST ---
logger.info('--- WADL Calculation Logic Test ---');
logger.info(`Input: 5 invoices @ 2000 (15 days late) + 1 invoice @ 100000 (0 days late)`);

// 1. Calculate Traditional (Simple Average) manually for comparison
// Total Late Days: (5 * 15) + 0 = 75
// Count: 6
const totalLateDays = mockInvoices.reduce((sum, inv) => sum + inv.Late_Days, 0);
const traditionalScore = totalLateDays / mockInvoices.length;
const expectedTraditional = 12.50;

logger.info(`\n[Traditional Calculation]`);
logger.info(`Total Late Days: ${totalLateDays}`);
logger.info(`Invoice Count: ${mockInvoices.length}`);
logger.info(`Score: ${traditionalScore.toFixed(2)} (Expected: ${expectedTraditional})`);

// 2. Calculate WADL using the function
// Total Value: (5 * 2000) + 100000 = 110,000
// Weighted Delay: (2000 * 15 * 5) + (100000 * 0) = 150,000
// Expected WADL: 150,000 / 110,000 = 1.3636... -> 1.36
const expectedWADL = 1.36;

const result = calculateWADL(mockInvoices);

logger.info(`\n[WADL Calculation]`);
logger.info(`Total Value: ${result.total_value}`);
logger.info(`Score: ${result.score} (Expected: ${expectedWADL})`);
logger.info(`Grade: ${result.grade}`);

// --- ASSERTIONS ---
let passed = true;

if (Math.abs(traditionalScore - expectedTraditional) > 0.01) {
    logger.error('❌ Traditional Score Mismatch');
    passed = false;
}

if (Math.abs(result.score - expectedWADL) > 0.01) {
    logger.error('❌ WADL Score Mismatch');
    passed = false;
}

if (passed) {
    logger.info('\n✅ TEST PASSED: WADL Logic is correct.');
} else {
    logger.info('\n❌ TEST FAILED');
    process.exit(1);
}
