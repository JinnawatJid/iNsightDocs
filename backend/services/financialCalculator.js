
/**
 * Calculates the slope of the linear regression line for the given data points.
 * @param {Array} data - Array of objects with an 'amount' property.
 * @returns {number} The slope of the regression line.
 */
const calculateSlope = (data) => {
    if (!data || data.length < 2) return 0;

    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // We use index (0, 1, 2...) as X and amount as Y
    for (let i = 0; i < n; i++) {
        const x = i;
        const y = data[i].amount;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = (n * sumXX) - (sumX * sumX);

    if (denominator === 0) return 0;
    return numerator / denominator;
};

/**
 * Calculates the trend ratio (1 + Slope / Average).
 * @param {number} slope - The calculated slope.
 * @param {number} average - The average value.
 * @returns {number} The trend ratio.
 */
const calculateTrendRatio = (slope, average) => {
    if (average === 0) return 1.0; // Avoid division by zero, neutral trend
    return 1 + (slope / average);
};

/**
 * Generates a continuous 6-month timeline ending at the 'anchor' month.
 * If data is missing for a month, it fills with 0.
 *
 * @param {Array} apiMonthlyData - List of { month: 'YYYY-MM', amount: number }
 * @returns {Array} - List of 7 months (oldest to newest) with continuous data (6 past + 1 current).
 */
const generateContinuousTimeline = (apiMonthlyData) => {
    // 1. Sort API data
    const sortedData = [...apiMonthlyData].sort((a, b) => a.month.localeCompare(b.month));

    // 2. Create Map for quick lookup
    const dataMap = new Map();
    sortedData.forEach(item => dataMap.set(item.month, item.amount));

    // 3. Determine Current System Month (YYYY-MM)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth() + 1; // 1-12
    const currentSystemMonth = `${currentYear}-${String(currentMonthIdx).padStart(2, '0')}`;

    // 4. Generate Timeline (Last 6 Months + Current Month = 7 Months)
    const timeline = [];
    for (let i = 0; i < 7; i++) {
        // Correct date arithmetic (works across years)
        const d = new Date(currentYear, currentMonthIdx - 1 - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;

        timeline.push({
            month: key,
            amount: dataMap.get(key) || 0
        });
    }

    // 5. Reverse (Oldest -> Newest)
    // [Month -6, Month -5, ... Month -1 (Completed), Current Month (Incomplete)]
    return timeline.reverse();
};

module.exports = {
    calculateSlope,
    calculateTrendRatio,
    generateContinuousTimeline
};
