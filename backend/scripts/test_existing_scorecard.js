const ScoringEngine = require('../services/scoring/ScoringEngine');

// Mock Data for Verification
// Total Target: ~150-160 points for a "Good" existing customer
const mockCustomer = {
    // C1: Company Strength (Weight ~27.4)
    customer: {
        years_in_business: 12,        // > 10 (Score 2.0 * 2.0) = 4.0
        residence_ownership: 'Own',   // Own (Score 2.0 * 5.0) = 10.0
    },
    registeredCapital: 2000000,
    requestAmount: 1000000,           // Leverage 0.5 (Score 2.0 * 6.7) = 13.4

    // C2: Financials (Weight ~21.0)
    isCompany: true,
    financials: {
        deRatio: { value: 0.8, column: '2023' },         // <= 1 (Score 2.0 * 5.5) = 11.0
        inventoryTurnover: { value: 15, column: '2023' }, // > 12 (Score 2.0 * 1.4) = 2.8
        dscr: 0.6,                                       // > 0.5 (Score 2.0 * 3.6) = 7.2
        averageRevenue: 4000000 // Ratio 2.0 (Score 2.0 * 7.5) = 15.0
    },

    // C3: Purchase Behavior (Weight ~151.6)
    accumData: {
        SecondAccum: 600000,  // 3-Month Purchase Total -> Avg 1.5 Month = 300,000
        Slope: 20000          // Strong Uptrend (Score 2.0 * 21.9) = 43.8
    },
    requestTerm: 30, // Turnover Speed = 300k / 1M = 0.3 (Very Slow < 0.5) -> Score 0.5 * 10.5 = 5.25
    customerDuration: 8, // > 7 Years (Score 2.0 * 6.0) = 12.0

    // NEW: WADL
    wadl: 4.5, // <= 5 Days (Score 1.5 * (19.8/2) = 14.85)

    // Config
    modelType: 'existing',
    limitExponent: 2.0
};

// Expected Scores (Based on new weights):
// C1: 4.0 + 13.4 + 10.0 = 27.4
// C2: 11.0 + 2.8 + 7.2 = 21.0
// C3:
//   - Rev/Cap: 15.0
//   - Capacity: 300k / 1M = 0.3 (Low 0.25-0.6) -> Score 0.5 * 20.0 = 10.0
//   - Speed: 0.3 (Very Slow) -> Score 0.5 * 10.5 = 5.25
//   - Trend: 43.8
//   - Duration: 12.0
//   - WADL: 4.5 Days (Excellent, Score 1.5/2.0) -> Score 1.5 * (19.8/2) = 14.85
//   - Total C3: 15.0 + 10.0 + 5.25 + 43.8 + 12.0 + 14.85 = 100.9

// Total Score: 27.4 + 21.0 + 100.9 = 149.3 (~149)

// Expected Limit:
// Avg 1.5 Month = 300,000
// Ratio = (149.3 / 200) ^ 2.0 = (0.7465)^2 = 0.55726
// Limit = 300,000 * 0.55726 = 167,178
// Rounded: 167,000

function runTest() {
    console.log("=== Testing Existing Customer Scorecard ===");

    try {
        const result = ScoringEngine.score(mockCustomer);

        console.log(`Total Score: ${result.totalScore} (Expected ~149)`);
        console.log(`Recommended Limit: ${result.recommendedLimit.toLocaleString()} (Expected ~167,000)`);
        console.log(`Grade: ${result.grade}`);

        // Validation
        if (result.totalScore >= 148 && result.totalScore <= 151) {
            console.log("✅ Score Calculation: PASS");
        } else {
            console.error(`❌ Score Calculation: FAIL (Got ${result.totalScore})`);
        }

        if (result.recommendedLimit >= 165000 && result.recommendedLimit <= 169000) {
            console.log("✅ Limit Calculation: PASS");
        } else {
            console.error(`❌ Limit Calculation: FAIL (Got ${result.recommendedLimit})`);
        }

        // Test WADL Sensitivity
        console.log("\n=== Testing WADL Sensitivity ===");
        const badWadl = { ...mockCustomer, wadl: 20 }; // > 15 Days (Score 0.0 * 9.9 = 0.0)
        // Diff = 14.85 - 0.0 = 14.85 points lower
        // Expected Score: 149.3 - 14.85 = 134.45
        const badResult = ScoringEngine.score(badWadl);
        console.log(`Bad WADL Score: ${badResult.totalScore} (Expected ~134)`);

        if (badResult.totalScore < result.totalScore) {
             console.log("✅ WADL Impact: PASS (Score dropped)");
        } else {
             console.error("❌ WADL Impact: FAIL");
        }

        // Test Exponent Sensitivity
        console.log("\n=== Testing Exponent Sensitivity ===");
        const sensitive = { ...mockCustomer, limitExponent: 3.0 };
        const sensitiveResult = ScoringEngine.score(sensitive);
        // Ratio = (0.7465)^3 = 0.416
        // Limit = 300k * 0.416 = 124,800
        console.log(`Exponent 3.0 Limit: ${sensitiveResult.recommendedLimit.toLocaleString()} (Expected ~125,000)`);

        if (sensitiveResult.recommendedLimit < result.recommendedLimit) {
             console.log("✅ Exponent Impact: PASS (Limit dropped with higher exponent for score < 200)");
        } else {
             console.error("❌ Exponent Impact: FAIL");
        }

    } catch (error) {
        console.error("❌ Error running test:", error);
    }
}

runTest();
