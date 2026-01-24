const ocrService = require('../services/ocrService');

const ocrController = {
  extractThaiID: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      // Check file type (basic validation)
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG are supported for OCR.' });
      }

      console.log(`Processing OCR request for file: ${req.file.originalname} (${req.file.size} bytes)`);

      const data = await ocrService.extractThaiID(req.file.buffer);

      res.status(200).json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('OCR Controller Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process document'
      });
    }
  }
};

module.exports = ocrController;
