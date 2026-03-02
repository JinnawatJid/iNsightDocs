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
     * Generates a list of definition objects (min, max, label) by dividing
     * the maxScore evenly among the provided labels. Labels must be ordered
     * from lowest score to highest score.
     * @param {number} maxScore - The maximum possible score.
     * @param {Array<string>} labels - List of category labels (e.g. ["S", "M", "L"]).
     * @returns {Array<Object>} Generated definitions suitable for evaluateDefinition.
     */
    generateDefinitions(maxScore, labels) {
        if (!labels || !Array.isArray(labels) || labels.length === 0) {
            return [];
        }

        const interval = maxScore / labels.length;
        const definitions = [];

        // Note: Definitions must be ordered correctly for evaluateDefinition to work.
        // evaluateDefinition evaluates from first to last in the array.
        // Since labels are lowest-to-highest, and evaluateDefinition checks
        // bounds sequentially, we'll build from highest to lowest so that
        // the top tier is evaluated first (like the hardcoded logic).
        for (let i = labels.length - 1; i >= 0; i--) {
            const label = labels[i];
            const lowerBound = Math.round(i * interval);
            const upperBound = Math.round((i + 1) * interval);

            const def = { label };

            if (i === labels.length - 1) {
                // Highest category (e.g., L, A+)
                def.min = lowerBound;
            } else if (i === 0) {
                // Lowest category (e.g., S, D)
                def.max = upperBound;
            } else {
                // Middle categories (e.g., M, C, B)
                def.min = lowerBound;
                def.max = upperBound;
            }

            definitions.push(def);
        }

        return definitions;
    }

    /**
     * Calculates the maximum possible score by summing up the weights of all
     * factors within the specified component keys.
     * @param {Object} components - The 'components' object from the config.
     * @param {Array<string>} componentKeys - Keys to include (e.g. ['c1', 'c2']).
     * @returns {number} The maximum possible score.
     */
    getMaxScore(components, componentKeys) {
        if (!components) return 0;
        let maxScore = 0;
        for (const key of componentKeys) {
            if (components[key] && Array.isArray(components[key].factors)) {
                for (const factor of components[key].factors) {
                    // Maximum possible points for a factor equals its weight
                    maxScore += factor.weight || 0;
                }
            }
        }
        return maxScore;
    }

    /**
     * Interface Method - Must be implemented by subclasses
     */
    calculateScore(context) {
        throw new Error("Method 'calculateScore' must be implemented.");
    }
}

module.exports = BaseScorecard;
