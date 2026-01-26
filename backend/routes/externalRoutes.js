const express = require('express');
const router = express.Router();
const externalController = require('../controllers/externalController');

router.post('/dbd-profile', externalController.downloadDBDProfile);
router.get('/dbd-stream', externalController.streamDBDProfile);

module.exports = router;
