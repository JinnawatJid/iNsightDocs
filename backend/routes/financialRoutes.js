const express = require('express');
const router = express.Router();
const multer = require('multer');
const financialController = require('../controllers/financialController');

// Configure multer for memory storage (we process buffers directly)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Define the file fields we expect
const cpUpload = upload.fields([
  { name: 'balance_sheet', maxCount: 1 },
  { name: 'profit_loss', maxCount: 1 },
  { name: 'financial_ratios', maxCount: 1 },
  { name: 'company_profile', maxCount: 1 }
]);

router.post('/analyze', cpUpload, financialController.analyzeFinancials);
router.get('/check-local/:customer_no', financialController.checkLocalFiles);
router.post('/check-local-batch', financialController.checkLocalFilesBatch);
router.post('/upload-local/:customer_no', cpUpload, financialController.uploadLocalFiles);
router.get('/download-local/:customer_no/:file_key', financialController.downloadLocalFile);
router.get('/late-payment-benchmark/:customer_no', financialController.getLatePaymentBenchmark);

router.get('/remaining-credit/:customer_no', financialController.getCustomerRemainingCredit);

module.exports = router;

// New Route for DBD Data Table API
router.get('/:customer_no/dbd-data', financialController.getDBDData);

// New endpoints for Project Actual Tracking
router.post('/project-invoices/:customer_no', financialController.getProjectInvoices);
router.post('/project-payments/:customer_no', financialController.getProjectPayments);
