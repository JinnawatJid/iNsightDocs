const fs = require('fs');
const path = require('path');

class ScorecardEvaluator {
    constructor() {
        const configPath = path.resolve(__dirname, '../../config/credit_scorecard_v1.json');
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(raw);
        } catch (error) {
            console.error(`[ScorecardEvaluator] Error loading config: ${error.message}`);
            this.config = null;
        }
    }

    /**
     * Evaluates a single value against a specific factor's rules.
     * @param {string} componentKey - e.g., 'c1'
     * @param {string} factorKey - e.g., 'years_in_business'
     * @param {number|string} value - The input value to score
     * @returns {Object} { score, finalScore, matchedRule }
     */
    evaluate(componentKey, factorKey, value) {
        if (!this.config) return { score: 0, finalScore: 0, matchedRule: "Config Error" };

        const component = this.config.components[componentKey];
        if (!component) return { score: 0, finalScore: 0, matchedRule: "Component Not Found" };

        const factor = component.factors.find(f => f.key === factorKey);
        if (!factor) return { score: 0, finalScore: 0, matchedRule: "Factor Not Found" };

        // Determine Matched Rule
        let matchedRule = null;
        const val = this.parseValue(value);

        for (const rule of factor.rules) {
            if (this.isMatch(val, rule)) {
                matchedRule = rule;
                break;
            }
        }

        if (!matchedRule) {
             // Try to find default
             matchedRule = factor.rules.find(r => r.default) || { score: 0, label: "No Match" };
        }

        // Calculate Final Score
        // Formula: Rule Score (0.25-2.0) * (Weight / 2)
        // Example: Years > 10 -> Score 2.0 * (14.42 / 2) = 14.42
        const finalScore = matchedRule.score * (factor.weight / 2.0);

        return {
            key: factorKey,
            label: factor.label,
            value: value,
            displayValue: typeof value === 'number' ? value.toFixed(2) : value,
            weight: factor.weight,
            score: finalScore,      // The weighted score added to total
            rawScore: matchedRule.score, // The multiplier (0.25-2.0)
            matchedRule: matchedRule.label
        };
    }

    parseValue(val) {
        if (typeof val === 'string') {
             // Remove commas
            const v = val.replace(/,/g, '');
            if (!isNaN(parseFloat(v))) return parseFloat(v);
            return val;
        }
        return val;
    }

    isMatch(value, rule) {
        // String Match (for Assets)
        if (rule.match) {
            if (!value) return false;
            const strVal = String(value).toLowerCase();
            return rule.match.some(m => strVal.includes(m.toLowerCase()));
        }

        // Numeric Range
        if (typeof value !== 'number') return false;

        // Check Min (Inclusive)
        if (rule.min !== undefined && value < rule.min) return false;

        // Check Max (Exclusive, typically)
        // But wait, the old logic was:
        // if (years >= 10) ...
        // else if (years >= 5) ... (implies < 10)
        // So Max is effectively Exclusive.
        if (rule.max !== undefined && value >= rule.max) return false;

        return true;
    }
}

module.exports = ScorecardEvaluator;
