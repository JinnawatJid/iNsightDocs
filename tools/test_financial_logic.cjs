const { calculateSlope, calculateTrendRatio } = require('../backend/services/financialCalculator');

// Mock formatters
const formatTrendFromRatio = (ratio) => {
    if (ratio === null || isNaN(ratio)) return null;
    const percent = (ratio - 1) * 100;
    const absVal = Math.abs(percent).toFixed(2);
    if (percent > 0.001) return `แนวโน้มการซื้อเพิ่มขึ้น ${absVal}%`;
    if (percent < -0.001) return `แนวโน้มการซื้อลดลง ${absVal}%`;
    return `แนวโน้มการซื้อคงที่ 0.00%`;
};

const formatAvgMonthlyChange = (slope) => {
    if (slope === null || isNaN(slope)) return null;
    const absVal = Math.abs(slope).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (slope > 0.001) return `เฉลี่ยซื้อเพิ่มขึ้นเดือนละ ${absVal} บาท`;
    if (slope < -0.001) return `เฉลี่ยซื้อลดลงเดือนละ ${absVal} บาท`;
    return `เฉลี่ยซื้อคงที่ 0.00 บาท`;
};

function runTest(name, data) {
    console.log(`\n--- Test: ${name} ---`);
    console.log('Data:', data.map(d => d.amount));

    const slope = calculateSlope(data);
    const sum = data.reduce((acc, cur) => acc + cur.amount, 0);
    const avg = sum / data.length;
    const trendRatio = calculateTrendRatio(slope, avg);

    console.log(`Slope: ${slope.toFixed(2)}`);
    console.log(`Average: ${avg.toFixed(2)}`);
    console.log(`Trend Ratio: ${trendRatio.toFixed(4)}`);
    console.log(`[Format] Trend: "${formatTrendFromRatio(trendRatio)}"`);
    console.log(`[Format] Slope: "${formatAvgMonthlyChange(slope)}"`);
}

// Case 1: Increasing (10k, 20k, 30k) -> Slope 10k, Trend +50%
runTest('Increasing', [
    { amount: 10000 },
    { amount: 20000 },
    { amount: 30000 }
]);

// Case 2: Decreasing (30k, 20k, 10k) -> Slope -10k, Trend -50%
runTest('Decreasing', [
    { amount: 30000 },
    { amount: 20000 },
    { amount: 10000 }
]);

// Case 3: Flat (20k, 20k, 20k) -> Slope 0, Trend 0%
runTest('Flat', [
    { amount: 20000 },
    { amount: 20000 },
    { amount: 20000 }
]);

// Case 4: Real Data Sample (172k, 567k, 440k)
// Note: This logic assumes these are Month 1, 2, 3 in CHRONOLOGICAL order.
// If your API returns them Oldest -> Newest (which my code sorts for), this is correct.
runTest('Real Data Sample', [
    { amount: 172935.25 },
    { amount: 567041.50 },
    { amount: 440718.50 }
]);

// Case 5: Sharp Drop (500k -> 400k -> 100k) -> Slope -200k, Trend -60%
runTest('Sharp Drop', [
    { amount: 500000 },
    { amount: 400000 },
    { amount: 100000 }
]);
