const express = require('express');
const router = express.Router();
const creditRequestController = require('../controllers/creditRequestController');
const pdfController = require('../controllers/pdfController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

// Apply multer middleware to handle multipart/form-data
router.post('/', authMiddleware, upload.any(), creditRequestController.createCreditRequest);
router.get('/', creditRequestController.getCreditRequests);
router.get('/:id/pdf', pdfController.generateCreditRequestPDF);
router.get('/:id/detail', creditRequestController.getCreditRequestDetail);
router.get('/:id/files/:fileId', creditRequestController.downloadCreditRequestFile);
router.delete('/:id/files/:fileId', authMiddleware, creditRequestController.deleteCreditRequestFile);
router.patch('/:id/cancel', creditRequestController.cancelCreditRequest);
router.get('/:id/comments', creditRequestController.getComments);
router.post('/:id/revise', creditRequestController.reviseRequest);

module.exports = router;
