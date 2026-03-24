const logger = require('../utils/logger');
const ocrService = require('../services/ocrService');

const ocrController = {
  async extractThaiID(req, res) {
    console.time('OCR Total Duration');
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      // Fix for Thai characters (UTF-8 encoded by browser, interpreted as Latin-1 by multer/busboy)
      if (req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }

      logger.info('OCR Controller: Received request for file:', req.file.originalname);

      const data = await ocrService.extractThaiID(req.file);
      res.json(data);
    } catch (error) {
      logger.error('OCR Controller: Error:', error.message);
      res.status(500).json({ error: 'OCR processing failed', details: error.message });
    } finally {
      console.timeEnd('OCR Total Duration');
    }
  },

  async compareModels(req, res) {
    console.time('OCR Compare Duration');
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      if (req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }

      logger.info('OCR Controller: Received compare request for file:', req.file.originalname);

      const results = await ocrService.compareModels(req.file);
      res.json(results);
    } catch (error) {
      logger.error('OCR Controller: Compare Error:', error.message);
      res.status(500).json({ error: 'OCR comparison failed', details: error.message });
    } finally {
      console.timeEnd('OCR Compare Duration');
    }
  }
};

module.exports = ocrController;
