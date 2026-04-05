const express = require('express');
const router = express.Router();
const creditRequestController = require('../controllers/creditRequestController');
const pdfController = require('../controllers/pdfController');
const upload = require('../middleware/upload');

// Apply multer middleware to handle multipart/form-data
router.post('/', upload.any(), creditRequestController.createCreditRequest);
router.get('/', creditRequestController.getCreditRequests);
router.get('/:id/pdf', pdfController.generateCreditRequestPDF);
router.get('/:id/detail', creditRequestController.getCreditRequestDetail);
router.get('/:id/files/:fileId', creditRequestController.downloadCreditRequestFile);
router.patch('/:id/cancel', creditRequestController.cancelCreditRequest);
router.get('/:id/comments', creditRequestController.getComments);
router.post('/:id/comments', creditRequestController.addComment);
router.post('/:id/revise', creditRequestController.reviseRequest);
router.post('/:id/additional-documents', upload.any(), creditRequestController.uploadAdditionalDocument);

module.exports = router;
