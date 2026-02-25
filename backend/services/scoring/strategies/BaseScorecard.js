const { calculateSlope, calculateTrendRatio, generateContinuousTimeline } = require('../../financialCalculator');

/**
 * BaseScorecard
 *
 * Provides shared scoring components (C1, C2) and helper methods used by all scoring strategies.
 */
class BaseScorecard {
    constructor() {
        // Base weights or configurations can be set here if needed
    }

    /**
     * Parses amount strings or numbers into a float.
     * @param {string|number} str
     */
    parseAmount(str) {
        if (str === null || str === undefined || str === '') return 0;
        if (typeof str === 'number') return str;
        let val = str.toString();
        // Remove commas
        val = val.replace(/,/g, '');
        // Handle parentheses for negative numbers (100) -> -100
        if (val.includes('(') && val.includes(')')) {
            val = val.replace(/[()]/g, '');
            val = -1 * parseFloat(val);
        } else {
            val = parseFloat(val);
        }
        return isNaN(val) ? 0 : val;
    }

    /**
     * Evaluates a score against a list of definitions (Size or Grade).
     * @param {number} score - The calculated score.
     * @param {Array} definitions - The list of rule objects (min, max, label).
     * @param {string} defaultLabel - Default label if no match found.
     * @returns {string} The matched label.
     */
    evaluateDefinition(score, definitions, defaultLabel = 'N/A') {
        if (!definitions || !Array.isArray(definitions)) {
            return defaultLabel;
        }

        for (const def of definitions) {
            // Check Min (Inclusive)
            if (def.min !== undefined && score < def.min) continue;
            // Check Max (Exclusive)
            if (def.max !== undefined && score >= def.max) continue;

            return def.label;
        }
        return defaultLabel;
    }

    /**
     * Interface Method - Must be implemented by subclasses
     */
    calculateScore(context) {
        throw new Error("Method 'calculateScore' must be implemented.");
    }
}

module.exports = BaseScorecard;
