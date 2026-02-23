const NewCustomerScorecard = require('./strategies/NewCustomerScorecard');

class ScoringEngine {

    /**
     * Factory Method to get the correct Scorecard Strategy
     * @param {Object} context - The scoring context
     */
    static getStrategy(context) {
        // Refactored to always use NewCustomerScorecard which is now configuration-driven.
        // We no longer switch strategies based on current limit for now,
        // as the goal is to standardize on the V1 JSON Scorecard.
        console.log(`[ScoringEngine] Selected: NewCustomerScorecard (Configuration Driven)`);
        return new NewCustomerScorecard();
    }

    /**
     * Main entry point for scoring.
     * @param {Object} context
     */
    static score(context) {
        const strategy = this.getStrategy(context);
        return strategy.calculateScore(context);
    }
}

module.exports = ScoringEngine;
