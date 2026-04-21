const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const checkIsAdmin = require('../middleware/checkIsAdmin');

// Define routes for configurations
// Feature flags can be accessed without admin rights
router.get('/features', configController.getFeatures);

router.get('/', checkIsAdmin, configController.getConfig);
router.put('/', checkIsAdmin, configController.updateConfig);

module.exports = router;
