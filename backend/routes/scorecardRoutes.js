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

// GET /api/scorecard/:type/versions - list historical versions
router.get('/:type/versions', authMiddleware, scorecardController.listVersions);

// GET /api/scorecard/:type/versions/:id - fetch a specific version
router.get('/:type/versions/:id', authMiddleware, scorecardController.getVersion);

// POST /api/scorecard/:type/versions/:id/revert - revert to a historical version (admin only)
router.post('/:type/versions/:id/revert', authMiddleware, checkIsAdmin, scorecardController.revertVersion);

module.exports = router;
