const express = require('express');
const router = express.Router();
const multer = require('multer');
const ocrController = require('../controllers/ocrController');

// Configure multer for memory storage (we process the buffer directly)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/ocr/extract-id
router.post('/extract-id', upload.single('document'), ocrController.extractThaiID);

// POST /api/ocr/benchmark
router.post('/benchmark', upload.single('document'), ocrController.runBenchmark);

module.exports = router;
