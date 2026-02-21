/**
 * Test Script for WADL Benchmark Calculation
 * Usage: node backend/scripts/test_wadl_benchmark.js
 */

const controller = require('../controllers/financialController');

// Mock Request/Response
const req = {
    params: { customer_no: 'TEST-001' }
};

const res = {
    json: (data) => {
        console.log('--- WADL Benchmark Test Result ---');
        console.log('Customer:', data.customer_no);
        console.log('\n[Comparison]');
        console.log(JSON.stringify(data.comparison, null, 2));

        console.log('\n[Validation]');
        const trad = data.comparison.traditional.score;
        const wadl = data.comparison.wadl.score;

        // Validation Logic based on the mock scenario in controller
        // Scenario: 5 invoices @ 2000 (15 days late) + 1 invoice @ 100000 (0 days late)
        // Total Late Days: (5 * 15) + 0 = 75
        // Count: 6
        // Expected Traditional: 75 / 6 = 12.50

        // Total Value: (5 * 2000) + 100000 = 110,000
        // Weighted Delay: (2000 * 15 * 5) + (100000 * 0) = 150,000
        // Expected WADL: 150,000 / 110,000 = 1.36

        console.log(`Expected Traditional: 12.50 | Actual: ${trad}`);
        console.log(`Expected WADL: 1.36       | Actual: ${wadl}`);

        if (Math.abs(trad - 12.50) < 0.01 && Math.abs(wadl - 1.36) < 0.01) {
            console.log('\n✅ TEST PASSED: Calculations are correct.');
        } else {
            console.log('\n❌ TEST FAILED: Calculations mismatch.');
        }
    }
};

// Run Test
try {
    controller.getLatePaymentBenchmark(req, res);
} catch (error) {
    console.error('Test Error:', error);
}
