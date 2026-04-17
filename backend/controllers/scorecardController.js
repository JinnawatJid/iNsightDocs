const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const getConfigFileName = (type) => {
    return type === 'existing' ? 'credit_scorecard_existing_v1.json' : 'credit_scorecard_v1.json';
};

const getScorecard = async (req, res) => {
    const { type } = req.params;
    const fileName = getConfigFileName(type);
    const filePath = path.resolve(__dirname, `../config/${fileName}`);

    try {
        const rawData = await fs.readFile(filePath, 'utf8');
        const configData = JSON.parse(rawData);
        res.status(200).json(configData);
    } catch (error) {
        logger.error(`[ScorecardController] Error reading scorecard ${fileName}: ${error.message}`);
        res.status(500).json({ message: 'Failed to read scorecard configuration.', error: error.message });
    }
};

const updateScorecard = async (req, res) => {
    const { type } = req.params;
    const configData = req.body;
    const fileName = getConfigFileName(type);
    const filePath = path.resolve(__dirname, `../config/${fileName}`);

    if (!configData || !configData.components) {
        return res.status(400).json({ message: 'Invalid scorecard data provided.' });
    }

    try {
        // Pretty print with 2 spaces for readability
        const jsonString = JSON.stringify(configData, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');

        logger.info(`[ScorecardController] Successfully updated scorecard: ${fileName} by user: ${req.user ? req.user.username : 'Unknown'}`);
        res.status(200).json({ message: 'Scorecard configuration updated successfully.' });
    } catch (error) {
        logger.error(`[ScorecardController] Error updating scorecard ${fileName}: ${error.message}`);
        res.status(500).json({ message: 'Failed to update scorecard configuration.', error: error.message });
    }
};

module.exports = {
    getScorecard,
    updateScorecard
};
