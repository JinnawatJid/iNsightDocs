const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

const requireAdminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    // Use environment variable for the secret.
    // Default is provided for development convenience but should be overridden in production.
    const secret = process.env.ADMIN_SECRET || 'changeme_in_production';

    if (adminKey && adminKey === secret) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Invalid Admin Key' });
    }
};

router.use(requireAdminAuth);

router.get('/logs', adminController.getSystemLogs);
router.get('/transactions', adminController.getRawTransactions);

module.exports = router;
