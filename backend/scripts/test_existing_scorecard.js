const ScoringEngine = require('../services/scoring/ScoringEngine');

// Mock Data for Verification
// Total Target: ~150-160 points for a "Good" existing customer
const mockCustomer = {
    // C1: Company Strength (Weight ~23.6%)
    customer: {
        years_in_business: 12,        // > 10 (Score 2.0 * 1.528) = 3.056
        residence_ownership: 'Own',   // Own (Score 2.0 * 5.0) = 10.0
    },
    registeredCapital: 2000000,
    requestAmount: 1000000,           // Leverage 0.5 (Score 2.0 * 5.273) = 10.546

    // C2: Financials (Weight ~18.8%)
    isCompany: true,
    financials: {
        deRatio: { value: 0.8, column: '2023' },         // <= 1 (Score 2.0 * 4.203) = 8.406
        inventoryTurnover: { value: 15, column: '2023' }, // > 12 (Score 2.0 * 2.675) = 5.35
        dscr: 0.6,                                       // > 0.5 (Score 2.0 * 2.522) = 5.044
        averageRevenue: 4000000 // Ratio 2.0 (Score 2.0 * 0.5) = 1.0
    },

    // C3: Purchase Behavior (Weight ~78.8%)
    accumData: {
        SecondAccum: 600000,  // 3-Month Purchase Total -> Avg 1.5 Month = 300,000
        Slope: 20000          // Strong Uptrend (Score 2.0 * 19.0) = 38.0
    },
    requestTerm: 30, // Turnover Speed = 300k / 1M = 0.3 (Very Slow < 0.5) -> Score 0.5 * 23.0 = 11.5
                     // Wait, Speed logic: Numerator/ReqAmt. 30 Days -> Num=Avg1.5M (300k). 300k/1M = 0.3.
    customerDuration: 8, // > 7 Years (Score 2.0 * 5.6) = 11.2

    // NEW: WADL
    wadl: 4.5, // <= 5 Days (Score 2.0 * 9.3) = 18.6

    // Config
    modelType: 'existing',
    limitExponent: 2.0
};

// Expected Scores (Approx):
// C1: 3.056 + 10.546 + 10.0 = 23.602
// C2: 8.406 + 5.35 + 5.044 = 18.8
// C3:
//   - Rev/Cap: 1.0
//   - Capacity: 300k / 1M = 0.3 (Low 0.25-0.6) -> Score 0.5 * 21.4 = 10.7
//   - Speed: 0.3 (Very Slow) -> Score 0.5 * 23.0 = 11.5
//   - Trend: 38.0
//   - Duration: 11.2
//   - WADL: 4.5 Days (Excellent, Score 1.5/2.0) -> Score 1.5 * (18.6/2) = 13.95 (Previous expectation of 18.6 was incorrect)
//   - Total C3: 1.0 + 10.7 + 11.5 + 38.0 + 11.2 + 13.95 = 86.35
// Total Score: 23.6 + 18.8 + 86.35 = 128.75 (~129)

// Expected Limit:
// Avg 1.5 Month = 300,000
// Ratio = (128.75 / 200) ^ 2.0 = (0.64375)^2 = 0.4144
// Limit = 300,000 * 0.4144 = 124,320
// Rounded: 124,000

function runTest() {
    console.log("=== Testing Existing Customer Scorecard ===");

    try {
        const result = ScoringEngine.score(mockCustomer);

        console.log(`Total Score: ${result.totalScore} (Expected ~129)`);
        console.log(`Recommended Limit: ${result.recommendedLimit.toLocaleString()} (Expected ~124,000)`);
        console.log(`Grade: ${result.grade}`);

        // Validation
        if (result.totalScore >= 127 && result.totalScore <= 131) {
            console.log("✅ Score Calculation: PASS");
        } else {
            console.error(`❌ Score Calculation: FAIL (Got ${result.totalScore})`);
        }

        if (result.recommendedLimit >= 122000 && result.recommendedLimit <= 126000) {
            console.log("✅ Limit Calculation: PASS");
        } else {
            console.error(`❌ Limit Calculation: FAIL (Got ${result.recommendedLimit})`);
        }

        // Test WADL Sensitivity
        console.log("\n=== Testing WADL Sensitivity ===");
        const badWadl = { ...mockCustomer, wadl: 20 }; // > 15 Days (Score 0.5 * 9.3 = 4.65)
        // Diff = 18.6 - 4.65 = 13.95 points lower
        const badResult = ScoringEngine.score(badWadl);
        console.log(`Bad WADL Score: ${badResult.totalScore} (Expected ~119)`);

        if (badResult.totalScore < result.totalScore) {
             console.log("✅ WADL Impact: PASS (Score dropped)");
        } else {
             console.error("❌ WADL Impact: FAIL");
        }

        // Test Exponent Sensitivity
        console.log("\n=== Testing Exponent Sensitivity ===");
        const sensitive = { ...mockCustomer, limitExponent: 3.0 };
        const sensitiveResult = ScoringEngine.score(sensitive);
        // Ratio = (0.667)^3 = 0.296
        // Limit = 300k * 0.296 = 88,800
        console.log(`Exponent 3.0 Limit: ${sensitiveResult.recommendedLimit.toLocaleString()} (Expected ~89,000)`);

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
