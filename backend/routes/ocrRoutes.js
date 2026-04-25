const express = require('express');
const router = express.Router();
const multer = require('multer');
const ocrController = require('../controllers/ocrController');

// Configure multer for memory storage (we process the buffer directly)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB static bound; actual limit checked in controllers
  }
});

// POST /api/ocr/extract-id
router.post('/extract-id', upload.single('document'), ocrController.extractThaiID);

// POST /api/ocr/compare
router.post('/compare', upload.single('document'), ocrController.compareModels);

module.exports = router;
