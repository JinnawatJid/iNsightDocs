const express = require('express');
const router = express.Router();
const externalController = require('../controllers/externalController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Outbound API for ERP/Sales (Protected by API Key)
router.get('/credit-status/:customerId', apiKeyAuth, externalController.getCreditStatus);

// DBD Integration
router.post('/dbd-profile', externalController.downloadDBDProfile);
router.get('/dbd-stream', externalController.streamDBDProfile);

module.exports = router;
