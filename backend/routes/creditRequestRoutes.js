const express = require('express');
const router = express.Router();
const creditRequestController = require('../controllers/creditRequestController');
const upload = require('../middleware/upload');

// Apply multer middleware to handle multipart/form-data
router.post('/', upload.any(), creditRequestController.createCreditRequest);
router.get('/', creditRequestController.getCreditRequests);

module.exports = router;
