const logger = require('../../utils/logger');
const NewCustomerScorecard = require('./strategies/NewCustomerScorecard');
const ExistingCustomerScorecard = require('./strategies/ExistingCustomerScorecard');

class ScoringEngine {

    /**
     * Factory Method to get the correct Scorecard Strategy
     * @param {Object} context - The scoring context
     */
    static getStrategy(context) {
        const customWeights = context.customWeights || null;
        if (context.modelType === 'existing') {
            logger.info(`[ScoringEngine] Selected: Existing Customer Scorecard`);
            return new ExistingCustomerScorecard(customWeights);
        }

        // Default to New Customer Model
        logger.info(`[ScoringEngine] Selected: New Customer Scorecard (Standard)`);
        return new NewCustomerScorecard(customWeights);
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
