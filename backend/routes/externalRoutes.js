const express = require('express');
const router = express.Router();
const externalController = require('../controllers/externalController');

router.post('/dbd-profile', externalController.downloadDBDProfile);

module.exports = router;
