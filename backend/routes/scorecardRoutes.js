const express = require('express');
const router = express.Router();
const scorecardController = require('../controllers/scorecardController');
const checkIsAdmin = require('../middleware/checkIsAdmin');
const authMiddleware = require('../middleware/authMiddleware');

// Base path: /api/scorecard

// GET /api/scorecard/:type - Fetch scorecard config (type: 'new' or 'existing')
router.get('/:type', authMiddleware, scorecardController.getScorecard);

// PUT /api/scorecard/:type - Update scorecard config
router.put('/:type', authMiddleware, checkIsAdmin, scorecardController.updateScorecard);

module.exports = router;
