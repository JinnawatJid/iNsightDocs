const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
// const poppler = require('pdf-poppler'); // Loaded dynamically to prevent Linux crash

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OCR_MODEL = process.env.OCR_MODEL || 'scb10x/typhoon-ocr1.5-3b';
const USE_MOCK = process.env.MOCK_OCR !== 'false';

/**
 * Service to handle OCR extraction from images via Ollama/Typhoon
 */
const ocrService = {
  /**
   * Extract data from a Thai ID card (Image or PDF)
   * @param {Object} file - The file object from multer (buffer, mimetype, path, etc.)
   * @returns {Promise<Object>} - Extracted data object
   */
  async extractThaiID(file) {
    if (USE_MOCK) {
      console.log('OCR Service: Using MOCK mode');
      return this._getMockData();
    }

    let imageBuffer = file.buffer;

    try {
      // Handle PDF: Convert first page to Image
      if (file.mimetype === 'application/pdf') {
         console.log('OCR Service: Detected PDF, converting to image...');
         imageBuffer = await this._convertPdfToImage(file.buffer);
      }

      console.log('OCR Service: Sending request to Ollama...');
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(OLLAMA_URL, {
        model: OCR_MODEL,
        prompt: `You are an intelligent OCR assistant specialized in Thai documents.
        Analyze this image of a Thai National ID Card.
        Extract the following information and return it strictly as a valid JSON object.
        Do not include markdown formatting (like \`\`\`json), just the raw JSON string.

        Keys required:
        - idNumber (The 13-digit ID number)
        - title (Thai title e.g., นาย, นาง, นางสาว)
        - firstName (Thai first name)
        - lastName (Thai last name)
        - address (Full address string)
        - dateOfBirth (DD/MM/YYYY or Thai format)
        - dateOfIssue
        - dateOfExpiry

        If a field is not clear, return null for that field.`,
        images: [base64Image],
        stream: false,
        format: "json"
      });

      const rawText = response.data.response;
      console.log('OCR Service: Received response from Ollama', rawText);

      try {
        const jsonData = JSON.parse(rawText);
        return jsonData;
      } catch (parseError) {
        console.error('OCR Service: Failed to parse JSON from model response', parseError);
        throw new Error('Model returned invalid JSON format');
      }

    } catch (error) {
      console.error('OCR Service: Error processing document', error.message);
      if (error.code === 'ECONNREFUSED') {
         throw new Error('Ollama service is not reachable. Please ensure Ollama is running.');
      }
      throw error;
    }
  },

  /**
   * Convert PDF buffer to Image Buffer (First Page)
   * Uses pdf-poppler which requires Poppler binaries installed on system
   */
  async _convertPdfToImage(pdfBuffer) {
    if (process.platform === 'linux') {
         console.warn('OCR Service: Linux detected. PDF conversion requires Poppler utils (pdftoppm). Mocking PDF conversion for stability in this env.');
         // In a real Linux env, we'd spawn('pdftoppm'). For now, return a dummy buffer or fail gracefully.
         // Since we can't easily mock a real image buffer that matches the PDF content without a converter,
         // we will throw a clear error if not in MOCK mode.
         if (USE_MOCK) return Buffer.from('mock-image-buffer');
         throw new Error('PDF conversion on Linux requires system dependencies. Please test with JPG/PNG or deploy to Windows.');
    }

    // Dynamic import for Windows support
    const poppler = require('pdf-poppler');

    // We need to write the buffer to a temp file because pdf-poppler works with files
    const tempDir = path.join(__dirname, '../../uploads/temp');
    await fs.ensureDir(tempDir);

    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);

    const opts = {
      format: 'jpeg',
      out_dir: tempDir,
      out_prefix: path.basename(tempPdfPath, path.extname(tempPdfPath)),
      page: 1 // Only first page
    };

    try {
      await poppler.convert(tempPdfPath, opts);

      // The output file will be named prefix-1.jpg
      const expectedOutputPath = path.join(tempDir, `${opts.out_prefix}-1.jpg`);

      if (await fs.pathExists(expectedOutputPath)) {
          const imageBuffer = await fs.readFile(expectedOutputPath);

          // Cleanup
          await fs.remove(tempPdfPath);
          await fs.remove(expectedOutputPath);

          return imageBuffer;
      } else {
          throw new Error('PDF conversion failed: Output image not found');
      }

    } catch (err) {
      // Cleanup on error
      if (await fs.pathExists(tempPdfPath)) await fs.remove(tempPdfPath);
      throw new Error('Failed to convert PDF to image. Please ensure Poppler is installed on the server.');
    }
  },

  /**
   * Returns mock data for testing purposes
   */
  _getMockData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          idNumber: '1-2345-67890-12-3',
          title: 'นาย',
          firstName: 'สมชาย',
          lastName: 'ใจดี',
          address: '123/45 หมู่ 6 ต.บ้านใหม่ อ.เมือง จ.ปทุมธานี 12000',
          dateOfBirth: '15/04/2533',
          dateOfIssue: '20/05/2566',
          dateOfExpiry: '14/04/2574'
        });
      }, 1500);
    });
  }
};

module.exports = ocrService;
