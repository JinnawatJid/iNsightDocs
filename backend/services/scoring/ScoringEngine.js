const NewCustomerScorecard = require('./strategies/NewCustomerScorecard');

class ScoringEngine {

    /**
     * Factory Method to get the correct Scorecard Strategy
     * @param {Object} context - The scoring context
     */
    static getStrategy(context) {
        // Standardize to use NewCustomerScorecard (which contains the robust logic)
        // for all customers, as requested for the refactor.
        console.log(`[ScoringEngine] Selected: Standard Scorecard`);
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
