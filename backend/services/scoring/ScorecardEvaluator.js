const fs = require('fs');
const path = require('path');

class ScorecardEvaluator {
    constructor() {
        this.config = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            // Adjust path based on where this file is located: backend/services/scoring/
            const configPath = path.join(__dirname, '../../config/credit_scorecard_v1.json');
            if (fs.existsSync(configPath)) {
                const rawData = fs.readFileSync(configPath);
                this.config = JSON.parse(rawData);
                console.log(`[ScorecardEvaluator] Loaded config v${this.config.version}`);
            } else {
                console.error(`[ScorecardEvaluator] Config file not found at: ${configPath}`);
                // Fallback or throw? Throwing is better to fail fast.
                throw new Error(`Config file not found at: ${configPath}`);
            }
        } catch (error) {
            console.error("[ScorecardEvaluator] Failed to load scorecard config:", error);
            throw error;
        }
    }

    /**
     * Evaluates a specific factor against the configuration.
     * @param {string} component - e.g., 'C1', 'C2'
     * @param {string} factorKey - e.g., 'yearsInBusiness'
     * @param {number|string} value - The value to evaluate
     * @returns {Object} { score, weight, matchedRule, label }
     */
    evaluate(component, factorKey, value) {
        if (!this.config) {
             throw new Error("Scorecard configuration not loaded.");
        }

        const componentConfig = this.config.components && this.config.components[component];
        if (!componentConfig) {
             console.warn(`[ScorecardEvaluator] Component not found: ${component}`);
             return { score: 0, weight: 0, matchedRule: 'Unknown Component', label: 'Unknown' };
        }

        const factorConfig = componentConfig.factors && componentConfig.factors[factorKey];
        if (!factorConfig) {
            console.warn(`[ScorecardEvaluator] Factor not found: ${component}.${factorKey}`);
            return this.getEmptyResult();
        }

        const weight = factorConfig.weight || 0;
        let matchedRule = null;
        let numericValue = null;

        // Pre-parse numeric value if applicable
        if (typeof value === 'number') {
            numericValue = value;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            numericValue = parseFloat(value);
        }

        // Iterate through rules to find a match
        // Rules are evaluated in order. First match wins.
        if (factorConfig.rules && Array.isArray(factorConfig.rules)) {
            for (const rule of factorConfig.rules) {
                if (this.isMatch(rule, value, numericValue)) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        if (!matchedRule) {
            // Fallback: Try to find a rule explicitly marked as 'default'
            matchedRule = factorConfig.rules?.find(r => r.default);
        }

        if (!matchedRule) {
            console.warn(`[ScorecardEvaluator] No rule matched for ${component}.${factorKey} with value: ${value}`);
            return {
                score: 0,
                weight: weight,
                matchedRule: 'No Match',
                label: factorConfig.label
            };
        }

        // Calculate Final Score
        // Formula: Rule Score (0-2 scale) * (Weight / 2)
        const ruleScore = matchedRule.score !== undefined ? matchedRule.score : 0;
        const calculatedScore = ruleScore * (weight / 2);

        return {
            score: calculatedScore,
            weight: weight,
            matchedRule: matchedRule.label,
            label: factorConfig.label
        };
    }

    isMatch(rule, rawValue, numericValue) {
        // 1. Handle String Matching (Array of keywords)
        if (rule.match && Array.isArray(rule.match)) {
            const strValue = String(rawValue);
            // Check if any keyword is contained in the string value
            return rule.match.some(keyword => strValue.includes(keyword));
        }

        // 2. Handle Default flag
        if (rule.default) return true;

        // 3. Handle Numeric Ranges
        // If we have a valid number to compare against
        if (numericValue !== null) {
            // Check Min (Inclusive: value >= min)
            if (rule.min !== undefined && numericValue < rule.min) {
                return false;
            }

            // Check Max (Inclusive: value <= max)
            // Changing to Inclusive to align with legacy logic (e.g., if x <= 0.5).
            // We rely on Rule Order (Top-Down) to ensure the "Best" bucket catches the boundary value first if ranges overlap.
            if (rule.max !== undefined && numericValue > rule.max) {
                 return false;
            }

            return true;
        }

        return false;
    }

    getEmptyResult() {
        return { score: 0, weight: 0, matchedRule: 'Unknown', label: 'Unknown' };
    }
}

// Export a singleton instance
module.exports = new ScorecardEvaluator();
