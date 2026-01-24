const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');

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
   * Uses local Poppler binaries in backend/poppler/
   */
  async _convertPdfToImage(pdfBuffer) {
    // Define path to local Windows binary
    // Note: This explicitly targets the 'backend/poppler' directory uploaded by the user
    const popplerPath = path.join(__dirname, '../poppler/pdftocairo.exe');

    // We need to write the buffer to a temp file because pdftocairo works with files
    const tempDir = path.join(__dirname, '../../uploads/temp');
    await fs.ensureDir(tempDir);

    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // Output prefix construction
    const outPrefix = path.basename(tempPdfPath, path.extname(tempPdfPath));
    const outPathPrefix = path.join(tempDir, outPrefix);

    // Arguments for pdftocairo
    const args = [
      '-jpeg',           // Output format
      '-f', '1',         // First page to convert
      '-l', '1',         // Last page to convert (only the first page)
      '-scale-to', '1024', // Scale the long side to 1024px
      tempPdfPath,       // Input file
      outPathPrefix      // Output prefix (pdftocairo will append -1.jpg)
    ];

    return new Promise((resolve, reject) => {
      console.log(`OCR Service: Executing local Poppler binary at ${popplerPath}`);
      
      execFile(popplerPath, args, async (error, stdout, stderr) => {
        if (error) {
          console.error('OCR Service: Poppler execution failed', stderr || error.message);
          // Attempt cleanup
          try { await fs.remove(tempPdfPath); } catch (e) {}
          
          if (error.code === 'ENOENT') {
             return reject(new Error(`Poppler binary not found at ${popplerPath}. Please ensure backend/poppler contains pdftocairo.exe`));
          }
          // If we are on Linux/Non-Windows, execFile with .exe might fail with generic error or specific format error
          if (process.platform !== 'win32') {
             return reject(new Error('Local Poppler binary execution failed. This configuration is intended for Windows environments using the bundled .exe files.'));
          }
          return reject(new Error('Failed to convert PDF to image using local Poppler.'));
        }

        // pdftocairo appends -1.jpg (or -000001.jpg depending on digit settings, but usually -1 for single digit pages)
        // Since we limited to page 1, and default numbering is often just the page number.
        // Let's verify the file existence.
        
        // Note: pdftocairo standard behavior: prefix + "-" + page_number + ".jpg"
        const expectedOutputPath = path.join(tempDir, `${outPrefix}-1.jpg`);

        if (await fs.pathExists(expectedOutputPath)) {
          try {
            const imageBuffer = await fs.readFile(expectedOutputPath);
            
            // Cleanup temp files
            await fs.remove(tempPdfPath);
            await fs.remove(expectedOutputPath);

            resolve(imageBuffer);
          } catch (readErr) {
            reject(new Error('Failed to read converted image file.'));
          }
        } else {
          // Cleanup input
          await fs.remove(tempPdfPath);
          reject(new Error('PDF conversion failed: Output image not found.'));
        }
      });
    });
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
