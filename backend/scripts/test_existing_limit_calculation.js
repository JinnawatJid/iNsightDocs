const ExistingCustomerScorecard = require('../services/scoring/strategies/ExistingCustomerScorecard');

// Helper to simulate context
const createContext = (accumData) => ({
    customer: {},
    registeredCapital: 1000000,
    requestAmount: 1000000,
    financials: {
        deRatio: { value: 0 },
        inventoryTurnover: { value: 0 },
        dscr: 0,
        averageRevenue: 1000000
    },
    accumData: accumData,
    requestTerm: 30,
    customerDuration: 10,
    isCompany: true,
    wadl: 0,
    limitExponent: 0.5 // Using 0.5 as per issue
});

// Case 1: 6-Month Data Available (Existing Customer Standard)
// Expected Base = SumLast6 / 4 = 1,000,000 / 4 = 250,000
// Score 161/200 -> Ratio ^ 0.5 = sqrt(0.805) = 0.897218
// Limit = 250,000 * 0.897218 = 224,304 -> Round to 224,000
const accumData6M = {
    SumLast6: 1000000,
    SecondAccum: 600000, // Should be ignored
    Slope: 0,
    Slope6: 0
};

// Case 2: Only 3-Month Data (Fallback)
// Expected Base = SecondAccum / 2 = 600,000 / 2 = 300,000
// Limit = 300,000 * 0.897218 = 269,165 -> Round to 269,000
const accumData3M = {
    // No SumLast6
    SecondAccum: 600000,
    Slope: 0
};

// Override methods to return fixed score 161
const scorecard = new ExistingCustomerScorecard();
scorecard.calculateC1 = () => ({ total: 50, items: [], debug: [] });
scorecard.calculateC2 = () => ({ total: 50, items: [], debug: [] });
scorecard.calculateC3 = () => ({ total: 61, items: [], debug: [] });

// Run Tests
const result6M = scorecard.calculateScore(createContext(accumData6M));
const result3M = scorecard.calculateScore(createContext(accumData3M));

console.log("=== Test Limit Calculation ===");
console.log(`[6-Month Logic] Limit: ${result6M.recommendedLimit} (Expected ~224,000)`);
console.log(`[Fallback Logic] Limit: ${result3M.recommendedLimit} (Expected ~269,000)`);

let pass = true;

if (Math.abs(result6M.recommendedLimit - 224000) < 1000) {
    console.log("✅ 6-Month Logic PASS");
} else {
    console.error("❌ 6-Month Logic FAIL");
    pass = false;
}

if (Math.abs(result3M.recommendedLimit - 269000) < 1000) {
    console.log("✅ Fallback Logic PASS");
} else {
    console.error("❌ Fallback Logic FAIL");
    pass = false;
}

if (!pass) process.exit(1);
