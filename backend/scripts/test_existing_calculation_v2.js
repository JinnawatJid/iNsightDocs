
const ExistingCustomerScorecard = require('../services/scoring/strategies/ExistingCustomerScorecard');
const { calculateSlope, calculateTrendRatio } = require('../services/financialCalculator');

// Mock Data: 6 Months
const mockMonthlyData = [
    { month: '2025-07', amount: 100000 },
    { month: '2025-08', amount: 120000 },
    { month: '2025-09', amount: 110000 },
    { month: '2025-10', amount: 130000 },
    { month: '2025-11', amount: 140000 },
    { month: '2025-12', amount: 150000 }
];

// Sum6 = 750,000
const sum6 = mockMonthlyData.reduce((acc, cur) => acc + cur.amount, 0);

// Slope6 Calculation
const slope6 = calculateSlope(mockMonthlyData);
const avg6 = sum6 / 6;
const trend6 = calculateTrendRatio(slope6, avg6);

// accumData for Existing Customer
const accumData = {
    // New/Legacy (Last 3)
    SecondAccum: 130000 + 140000 + 150000, // 420,000
    // Existing (Last 6)
    SumLast6: sum6,
    Trend6: trend6,
    Slope6: slope6
};

console.log('--- Mock Data Setup ---');
console.log('Sum Last 6 Months:', sum6.toLocaleString());
console.log('Sum Last 3 Months:', accumData.SecondAccum.toLocaleString());
console.log('Slope (6m):', slope6.toFixed(2));
console.log('Trend Ratio (6m):', trend6.toFixed(2));

// Test Cases
const testCases = [
    {
        name: 'Existing Customer - 60 Days Term',
        context: {
            customer: { years_in_business: 5 },
            financials: {
                averageRevenue: 12000000, // 1M/month
                deRatio: { value: 1.5 },
                inventoryTurnover: { value: 5 },
                dscr: 1.2
            },
            accumData: accumData,
            requestAmount: 500000,
            requestTerm: 60,
            registeredCapital: 1000000,
            modelType: 'existing'
        }
    }
];

const scorecard = new ExistingCustomerScorecard();

console.log('\n--- Running Tests ---');

testCases.forEach(tc => {
    console.log(`Test: ${tc.name}`);
    const result = scorecard.calculateScore(tc.context);

    // Verify C3 Breakdown
    const c3 = result.breakdown.c3;
    const debug = c3.debug;

    console.log('C3 Breakdown Debug Items:');
    debug.forEach(d => {
        console.log(`- ${d.label}: ${d.value} (Score: ${d.score})`);
    });

    // 1. Check Avg 1.5 Months Logic
    // Formula: Sum6 / 4
    const expectedAvg1_5 = sum6 / 4; // 187,500
    console.log(`\nVerifying "Avg 1.5 Month" Logic:`);
    // Note: Avg 1.5m is used inside Capacity Check & Turnover Speed, but not explicitly exposed as a debug item itself.
    // However, it feeds into "Capacity Check" = Avg 1.5m / RequestAmount
    // 187,500 / 500,000 = 0.375 -> 0.38
    const capCheckItem = debug.find(d => d.label.includes('Capacity'));
    const expectedCapRatio = (expectedAvg1_5 / tc.context.requestAmount).toFixed(2);

    if (capCheckItem && capCheckItem.value === expectedCapRatio) {
        console.log(`PASS: Capacity Check Ratio matches expected (${expectedCapRatio})`);
    } else {
        console.log(`FAIL: Capacity Check Ratio expected ${expectedCapRatio}, got ${capCheckItem ? capCheckItem.value : 'N/A'}`);
    }

    // 2. Check Turnover Speed (60 Days) Logic
    // Formula: (Sum6 / 6) * 2 / RequestAmount = Sum6 / 3 / RequestAmount
    // 750,000 / 3 = 250,000
    // 250,000 / 500,000 = 0.50
    const turnoverItem = debug.find(d => d.label === 'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ');
    const expectedTurnover = (sum6 / 3 / tc.context.requestAmount).toFixed(2);

    if (turnoverItem) {
        if (turnoverItem.value === expectedTurnover) {
            console.log(`PASS: Turnover Speed (Renamed) matches expected (${expectedTurnover})`);
        } else {
            console.log(`FAIL: Turnover Speed expected ${expectedTurnover}, got ${turnoverItem.value}`);
        }
        console.log(`PASS: Label Renamed Correctly`);
    } else {
        console.log(`FAIL: Turnover Speed item not found (Label might be wrong)`);
    }

    // 3. Check Purchase Trend (Slope)
    // Should use Slope6
    const trendItem = debug.find(d => d.label.includes('Slope'));
    if (trendItem && parseFloat(trendItem.value).toFixed(2) === slope6.toFixed(2)) {
         console.log(`PASS: Purchase Trend uses Slope6 (${slope6.toFixed(2)})`);
    } else {
         console.log(`FAIL: Purchase Trend expected ${slope6.toFixed(2)}, got ${trendItem ? trendItem.value : 'N/A'}`);
    }

});
