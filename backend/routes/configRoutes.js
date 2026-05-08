const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const checkIsAdmin = require('../middleware/checkIsAdmin');

// Define routes for configurations
// Feature flags
router.get('/features', configController.getFeatures);

//workflow config needed by all roles for sidebar/action bar rendering
router.get('/workflow', configController.getWorkflowConfig);

//RBAC config needed by all roles for UI rendering (e.g. NPL toggle)
router.get('/rbac', configController.getRbacConfig);

//config read/write
router.get('/', checkIsAdmin, configController.getConfig);
router.put('/', checkIsAdmin, configController.updateConfig);

module.exports = router;
