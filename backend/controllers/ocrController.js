const ocrService = require('../services/ocrService');

const ocrController = {
  async extractThaiID(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      console.log('OCR Controller: Received request for file:', req.file.originalname);
      const data = await ocrService.extractThaiID(req.file);
      res.json(data);
    } catch (error) {
      console.error('OCR Controller: Error:', error.message);
      res.status(500).json({ error: 'OCR processing failed', details: error.message });
    }
  }
};

module.exports = ocrController;
