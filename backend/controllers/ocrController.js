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

      console.log('OCR Controller: Received request for file:', req.file.originalname);

      const data = await ocrService.extractThaiID(req.file);
      res.json(data);
    } catch (error) {
      console.error('OCR Controller: Error:', error.message);
      res.status(500).json({ error: 'OCR processing failed', details: error.message });
    } finally {
      console.timeEnd('OCR Total Duration');
    }
  },

  async runBenchmark(req, res) {
    console.time('Benchmark Total Duration');
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      // Fix for Thai characters
      if (req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }

      console.log('OCR Controller: Starting benchmark for file:', req.file.originalname);

      const file = req.file;

      // 1. Typhoon OCR (Current)
      const startTyphoon = Date.now();
      let typhoonResult = {};
      try {
        const result = await ocrService.extractThaiID(file);
        typhoonResult = {
            success: true,
            data: result,
            rawText: result.rawText // Assuming extractThaiID now returns rawText
        };
      } catch (e) {
        typhoonResult = { success: false, error: e.message };
      }
      const timeTyphoon = Date.now() - startTyphoon;

      // 2. Tesseract.js
      const startTesseract = Date.now();
      const tesseractResult = await ocrService.extractWithTesseract(file);
      const timeTesseract = Date.now() - startTesseract;

      // 3. EasyOCR
      const startEasyOCR = Date.now();
      const easyOCRResult = await ocrService.extractWithEasyOCR(file);
      const timeEasyOCR = Date.now() - startEasyOCR;

      res.json({
        typhoon: {
          name: 'Typhoon OCR (Current)',
          timeMs: timeTyphoon,
          result: typhoonResult
        },
        tesseract: {
          name: 'Tesseract.js',
          timeMs: timeTesseract,
          result: tesseractResult
        },
        easyocr: {
          name: 'EasyOCR (Python)',
          timeMs: timeEasyOCR,
          result: easyOCRResult
        }
      });

    } catch (error) {
      console.error('OCR Controller: Benchmark Error:', error.message);
      res.status(500).json({ error: 'Benchmark failed', details: error.message });
    } finally {
      console.timeEnd('Benchmark Total Duration');
    }
  }
};

module.exports = ocrController;
