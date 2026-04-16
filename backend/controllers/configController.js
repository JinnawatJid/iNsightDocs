const db = require('../db');
const logger = require('../utils/logger');

// GET /api/config
// Returns all configurations grouped by category
exports.getConfig = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Configurations');
        const rows = result.rows || [];

        // Group by category
        const groupedConfigs = rows.reduce((acc, config) => {
            const category = config.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(config);
            return acc;
        }, {});

        res.json({ success: true, data: groupedConfigs });
    } catch (error) {
        logger.error('Error fetching configurations:', error);
        res.status(500).json({ success: false, message: 'Internal server error fetching configurations' });
    }
};

// PUT /api/config
// Accepts an array of { config_key, config_value } to update them
exports.updateConfig = async (req, res) => {
    try {
        const { configs } = req.body;

        if (!configs || !Array.isArray(configs)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: expected an array of configs' });
        }

        const updated_by = req.user?.username || 'system';
        const updated_at = new Date().toISOString(); // UTC timestamp

        for (const config of configs) {
            const { config_key, config_value } = config;

            if (!config_key) continue;

            const query = `
                UPDATE Configurations
                SET config_value = ?, updated_at = ?, updated_by = ?
                WHERE config_key = ?
            `;
            await db.query(query, [config_value, updated_at, updated_by, config_key]);

            // Trigger dynamic reconfiguration if specific keys are updated
            if (config_key === 'AUDIT_LOG_RETENTION_DAYS') {
                const days = parseInt(config_value, 10);
                if (!isNaN(days)) {
                    logger.updateLogRetention(days);
                }
            }
        }

        res.json({ success: true, message: 'Configurations updated successfully' });
    } catch (error) {
        logger.error('Error updating configurations:', error);
        res.status(500).json({ success: false, message: 'Internal server error updating configurations' });
    }
};
