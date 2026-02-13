// Service for shared financial calculations

/**
 * Calculates the slope of a linear regression line (y = mx + b)
 * @param {Array<{amount: number}>} data - Array of objects with an 'amount' property, ordered chronologically.
 * @returns {number} The slope (m).
 */
const calculateSlope = (data) => {
    // Formula: slope = (N * Σ(xy) - Σx * Σy) / (N * Σ(x^2) - (Σx)^2)
    const n = data.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // Use indices 1, 2, 3... as X values (Month 1, Month 2...)
    for (let i = 0; i < n; i++) {
        const x = i + 1;
        const y = data[i].amount;

        sumX += x;
        sumY += y;
        sumXY += (x * y);
        sumXX += (x * x);
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = (n * sumXX) - (sumX * sumX);

    if (denominator === 0) return 0;
    return numerator / denominator;
};

/**
 * Calculates the Trend Ratio based on Slope and Average Revenue
 * Formula: 1 + (Slope / AveragePerMonth)
 * @param {number} slope - The calculated slope.
 * @param {number} averagePerMonth - The average monthly revenue.
 * @returns {number} The trend ratio (e.g., 1.10 = +10%, 0.90 = -10%).
 */
const calculateTrendRatio = (slope, averagePerMonth) => {
    if (averagePerMonth === 0) {
        // Edge case: If average is 0 but slope is positive (from 0 to something), trend is technically infinite.
        // But for ratio consistency, let's treat it based on slope direction.
        if (slope > 0) return 2.0; // Max positive
        if (slope < 0) return 0.0; // Max negative
        return 1.0; // Flat
    }
    return 1 + (slope / averagePerMonth);
};

module.exports = {
    calculateSlope,
    calculateTrendRatio
};
