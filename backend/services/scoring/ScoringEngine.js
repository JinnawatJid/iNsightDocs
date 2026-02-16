const NewCustomerScorecard = require('./strategies/NewCustomerScorecard');
const ExistingCustomerScorecard = require('./strategies/ExistingCustomerScorecard');

class ScoringEngine {

    /**
     * Factory Method to get the correct Scorecard Strategy
     * @param {Object} context - The scoring context
     */
    static getStrategy(context) {
        // Trigger: Check if customer has an existing Credit Limit > 0
        const currentLimit = parseFloat(context.currentCreditLimit || 0);

        if (currentLimit > 0) {
            console.log(`[ScoringEngine] Selected: ExistingCustomerScorecard (Limit: ${currentLimit})`);
            return new ExistingCustomerScorecard();
        } else {
            console.log(`[ScoringEngine] Selected: NewCustomerScorecard`);
            return new NewCustomerScorecard();
        }
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
