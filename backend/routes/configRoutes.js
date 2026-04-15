const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const checkIsAdmin = require('../middleware/checkIsAdmin');

// Define routes for configurations
router.get('/', checkIsAdmin, configController.getConfig);
router.put('/', checkIsAdmin, configController.updateConfig);

module.exports = router;
