const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const checkIsAdmin = require('../middleware/checkIsAdmin');

// Define routes for configurations
// Feature flags (no auth required)
router.get('/features', configController.getFeatures);

// Public read-only: workflow config needed by all roles for sidebar/action bar rendering
router.get('/workflow', configController.getWorkflowConfig);

// Admin-only: full config read/write
router.get('/', checkIsAdmin, configController.getConfig);
router.put('/', checkIsAdmin, configController.updateConfig);

module.exports = router;
