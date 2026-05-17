const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const scorecardVersionService = require('../services/scorecardVersionService');

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

        // Persist a version record in DB (creates immutable history)
        try {
            const createdBy = req.user ? req.user.username : 'unknown';
            const comment = req.body._versionComment || '';
            await scorecardVersionService.createVersion({ type, configJson: jsonString, createdBy, comment });
        } catch (svcErr) {
            logger.error(`[ScorecardController] Failed to create DB version for scorecard: ${svcErr.message}`);
            // continue to write file for backward compatibility
        }

        // Also update the canonical JSON file on disk for backward compatibility
        await fs.writeFile(filePath, jsonString, 'utf8');

        logger.info(`[ScorecardController] Successfully updated scorecard: ${fileName} by user: ${req.user ? req.user.username : 'Unknown'}`);
        res.status(200).json({ message: 'Scorecard configuration updated successfully.' });
    } catch (error) {
        logger.error(`[ScorecardController] Error updating scorecard ${fileName}: ${error.message}`);
        res.status(500).json({ message: 'Failed to update scorecard configuration.', error: error.message });
    }
};

// GET /api/scorecard/:type/versions - list versions
const listVersions = async (req, res) => {
    const { type } = req.params;
    try {
        const rows = await scorecardVersionService.listVersions(type);
        res.status(200).json(rows);
    } catch (err) {
        logger.error(`[ScorecardController] Error listing versions for ${type}: ${err.message}`);
        res.status(500).json({ message: 'Failed to list versions.', error: err.message });
    }
};

// GET /api/scorecard/:type/versions/:id - fetch a specific version
const getVersion = async (req, res) => {
    const { id } = req.params;
    try {
        const version = await scorecardVersionService.getVersionById(id);
        if (!version) return res.status(404).json({ message: 'Version not found' });
        // Return parsed JSON for convenience
        const parsed = JSON.parse(version.config_json);
        res.status(200).json({ meta: { id: version.id, version_number: version.version_number, created_by: version.created_by, created_at: version.created_at, comment: version.comment }, config: parsed });
    } catch (err) {
        logger.error(`[ScorecardController] Error fetching version ${id}: ${err.message}`);
        res.status(500).json({ message: 'Failed to fetch version.', error: err.message });
    }
};

// POST /api/scorecard/:type/versions/:id/revert - revert to a specific version
const revertVersion = async (req, res) => {
    const { id } = req.params;
    try {
        const performedBy = req.user ? req.user.username : 'unknown';
        const newVer = await scorecardVersionService.revertToVersion(id, performedBy);
        // Also update the canonical JSON file for backward compatibility
        const version = await scorecardVersionService.getVersionById(newVer.id);
        const fileName = getConfigFileName(version.type);
        const filePath = path.resolve(__dirname, `../config/${fileName}`);
        await fs.writeFile(filePath, version.config_json, 'utf8');

        res.status(200).json({ message: 'Reverted to version', id: newVer.id, version_number: newVer.version_number });
    } catch (err) {
        logger.error(`[ScorecardController] Error reverting to version ${id}: ${err.message}`);
        res.status(500).json({ message: 'Failed to revert version.', error: err.message });
    }
};

module.exports = {
    getScorecard,
    updateScorecard,
    listVersions,
    getVersion,
    revertVersion
};
