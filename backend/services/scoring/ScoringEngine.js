const NewCustomerScorecard = require('./strategies/NewCustomerScorecard');
const ExistingCustomerScorecard = require('./strategies/ExistingCustomerScorecard');

class ScoringEngine {

    /**
     * Factory Method to get the correct Scorecard Strategy
     * @param {Object} context - The scoring context
     */
    static getStrategy(context) {
        if (context.modelType === 'existing') {
            console.log(`[ScoringEngine] Selected: Existing Customer Scorecard`);
            return new ExistingCustomerScorecard();
        }

        // Default to New Customer Model
        console.log(`[ScoringEngine] Selected: New Customer Scorecard (Standard)`);
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
