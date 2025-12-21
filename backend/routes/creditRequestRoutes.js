const express = require('express');
const router = express.Router();
const creditRequestController = require('../controllers/creditRequestController');
const pdfController = require('../controllers/pdfController');
const upload = require('../middleware/upload');

// Apply multer middleware to handle multipart/form-data
router.post('/', upload.any(), creditRequestController.createCreditRequest);
router.get('/', creditRequestController.getCreditRequests);
router.get('/:id/pdf', pdfController.generateCreditRequestPDF);
router.patch('/:id/cancel', creditRequestController.cancelCreditRequest);

module.exports = router;
