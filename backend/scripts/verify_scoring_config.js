const logger = require('../utils/logger');
const ScorecardEvaluator = require('../services/scoring/ScorecardEvaluator');

/**
 * Verification Script for Credit Scoring Logic
 *
 * This script runs a series of test cases against the new JSON-based
 * ScorecardEvaluator to ensure it produces the expected scores.
 *
 * Expected Results based on OLD Hardcoded Logic (NewCustomerScorecard.js)
 */

const evaluator = new ScorecardEvaluator();

const testCases = [
    // --- C1: Company Strength ---
    {
        component: 'c1',
        factor: 'years_in_business',
        input: 12,
        expectedScore: 14.42, // Max (2.0 * 7.21)
        expectedLabel: 'ดำเนินกิจการมานาน (> 10 ปี)'
    },
    {
        component: 'c1',
        factor: 'years_in_business',
        input: 5,
        expectedScore: 10.815, // 1.5 * 7.21
        expectedLabel: 'มั่นคง (5-10 ปี)'
    },
    {
        component: 'c1',
        factor: 'years_in_business',
        input: 0.5,
        expectedScore: 1.8025, // 0.25 * 7.21
        expectedLabel: 'กิจการใหม่มาก (< 1 ปี)'
    },
    {
        component: 'c1',
        factor: 'leverage',
        input: 0.4,
        expectedScore: 8.64, // 2.0 * 4.32
        expectedLabel: 'ความเสี่ยงต่ำมาก (<= 0.5)'
    },
    {
        component: 'c1',
        factor: 'asset_ownership',
        input: 'Own',
        expectedScore: 25.94, // 2.0 * 12.97
        expectedLabel: 'เป็นเจ้าของ (ตนเอง)'
    },

    // --- C2: Financial Status ---
    {
        component: 'c2',
        factor: 'de_ratio',
        input: 0.8,
        expectedScore: 24.76, // 2.0 * 12.38
        expectedLabel: 'ดีเยี่ยม (<= 1.0)'
    },
    {
        component: 'c2',
        factor: 'de_ratio',
        input: 2.5,
        expectedScore: 12.38, // 1.0 * 12.38
        expectedLabel: 'แย่ (2.0-3.0)'
    },

    // --- C3: Purchase Behavior ---
    {
        component: 'c3',
        factor: 'revenue_capital_ratio',
        input: 1.6,
        expectedScore: 3.04, // 2.0 * 1.52
        expectedLabel: 'ดีเยี่ยม (>= 1.5)'
    },
    {
        component: 'c3',
        factor: 'purchase_trend',
        input: 20000,
        expectedScore: 28.96, // 2.0 * 14.48
        expectedLabel: 'แนวโน้มขาขึ้นอย่างมาก (> 16k)'
    }
];

function runTests() {
    logger.info("Starting Verification Tests for Credit Scoring Model (JSON Config)...");
    let passed = 0;
    let failed = 0;

    testCases.forEach((test, index) => {
        const result = evaluator.evaluate(test.component, test.factor, test.input);

        // Check Score Tolerance (Floating Point)
        const scoreDiff = Math.abs(result.score - test.expectedScore); // Use result.score (the final score)
        const scoreMatch = scoreDiff < 0.001;

        // Check Label Match (Optional but good)
        const labelMatch = result.matchedRule === test.expectedLabel;

        if (scoreMatch && labelMatch) {
            logger.info(`✅ Test ${index + 1}: ${test.factor} (${test.input}) -> Passed`);
            passed++;
        } else {
            logger.error(`❌ Test ${index + 1}: ${test.factor} (${test.input}) -> FAILED`);
            logger.error(`   Expected Score: ${test.expectedScore}, Got: ${result.score}`);
            logger.error(`   Expected Label: ${test.expectedLabel}, Got: ${result.matchedRule}`);
            failed++;
        }
    });

    logger.info("\n--------------------------------------------------");
    logger.info(`Results: ${passed} Passed, ${failed} Failed`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
