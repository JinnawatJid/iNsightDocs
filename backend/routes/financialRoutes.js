const express = require('express');
const router = express.Router();
const multer = require('multer');
const financialController = require('../controllers/financialController');

// Configure multer for memory storage (we process buffers directly)
const upload = multer({ storage: multer.memoryStorage() });

// Define the file fields we expect
const cpUpload = upload.fields([
  { name: 'balance_sheet', maxCount: 1 },
  { name: 'profit_loss', maxCount: 1 },
  { name: 'financial_ratios', maxCount: 1 }
]);

router.post('/analyze', cpUpload, financialController.analyzeFinancials);

module.exports = router;
