const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
// Default to the low-memory model to prevent crashes on standard machines
const OCR_MODEL = process.env.OCR_MODEL || 'typhoon-ocr-lowmem';
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

      // Start Heartbeat logging
      const startTime = Date.now();
      const heartbeat = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`OCR Service: Waiting for Ollama... (${elapsed}s elapsed)`);
      }, 5000);

      let response;
      try {
        response = await axios.post(OLLAMA_URL, {
          model: OCR_MODEL,
          prompt: `Extract all text from the image.

Instructions:
- Only return the clean Markdown.
- Do not include any explanation or extra text.
- You must include all information on the page.

Formatting Rules:
- Tables: Render tables using <table>...</table> in clean HTML format.
- Equations: Render equations using LaTeX syntax with inline ($...$) and block ($$...$$).
- Images/Charts/Diagrams: Wrap any clearly defined visual areas (e.g. charts, diagrams, pictures) in:

<figure>
Describe the image's main elements (people, objects, text), note any contextual clues (place, event, culture), mention visible text and its meaning, provide deeper analysis when relevant (especially for financial charts, graphs, or documents), comment on style or architecture if relevant, then give a concise overall summary. Describe in Thai.
</figure>

- Page Numbers: Wrap page numbers in <page_number>...</page_number> (e.g., <page_number>14</page_number>).
- Checkboxes: Use ☐ for unchecked and ☑ for checked boxes.`,
          images: [base64Image],
          stream: false
        });
      } finally {
        clearInterval(heartbeat);
      }

      const rawText = response.data.response;
      console.log('OCR Service: Received response from Ollama (Length: ' + rawText.length + ')');

      try {
        const data = this._parseMarkdownToData(rawText);
        return data;
      } catch (parseError) {
        console.error('OCR Service: Failed to parse data from model response.');
        console.error('--- RAW OLLAMA OUTPUT START ---');
        console.error(rawText);
        console.error('--- RAW OLLAMA OUTPUT END ---');
        throw new Error('Model returned unparseable format');
      }

    } catch (error) {
      console.error('OCR Service: Error processing document', error.message);

      if (error.code === 'ECONNREFUSED') {
         throw new Error('Ollama service is not reachable. Please ensure Ollama is running.');
      }

      // Check for memory-related 500 errors from Ollama
      if (error.response && error.response.status === 500) {
        const errorData = error.response.data;
        if (typeof errorData === 'string' && errorData.includes('more system memory')) {
           throw new Error(`Model memory limit exceeded. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to install the optimized model.`);
        } else if (errorData && errorData.error && errorData.error.includes('more system memory')) {
           throw new Error(`Model memory limit exceeded. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to install the optimized model.`);
        }
      }

      // Fallback: If the model is not found, suggest running the setup script
      if (error.response && error.response.status === 404) {
          throw new Error(`Model '${OCR_MODEL}' not found. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to create it.`);
      }

      throw error;
    }
  },

  /**
   * Parses raw Markdown text from Ollama into structured JSON
   */
  _parseMarkdownToData(text) {
    const result = {
        idNumber: null,
        title: null,
        firstName: null,
        lastName: null,
        address: null,
        dateOfBirth: null,
        dateOfIssue: null,
        dateOfExpiry: null
    };

    if (!text) return result;

    // Helper: Normalize spaces
    const cleanText = text.replace(/\r\n/g, '\n');

    // 1. ID Number
    // Regex: 13 digits, allowing spaces/dashes.
    const idMatch = cleanText.match(/\b\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d\b/);
    if (idMatch) {
        result.idNumber = idMatch[0].replace(/[^0-9]/g, '');
    }

    // 2. Name
    // Order matters! Longest matches first to avoid partial matches (e.g. นาง vs นางสาว)
    const nameRegex = /(นางสาว|นาย|นาง|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.)\s*([^\s]+)\s+([^\s]+)/;
    const nameMatch = cleanText.match(nameRegex);
    if (nameMatch) {
        result.title = nameMatch[1];
        result.firstName = nameMatch[2];
        result.lastName = nameMatch[3];
    }

    // 3. Address
    // Capture everything after the keyword until the end of the line, or next line if it doesn't look like a key.
    const addressMatch = cleanText.match(/(?:ที่อยู่|Address)[^:\d]*[:\s]\s*([\s\S]+?)(?=\n.*(?:วัน|Date|Issue|Expiry|Religion|ศาสนา)|$)/i);
    if (addressMatch) {
        let addr = addressMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        result.address = addr;
    }

    // 4. Dates
    // Generic Date Matcher: D/DD Month YYYY
    const datePattern = "([0-9]{1,2}\\s+[\\S]+\\s+[0-9]{4})";

    // Date of Birth
    const dobRegex = new RegExp(`(?:เกิด|Birth)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const dobMatch = cleanText.match(dobRegex);
    if (dobMatch) {
        result.dateOfBirth = dobMatch[1];
    }

    // Date of Issue
    const issueRegex = new RegExp(`(?:วันออกบัตร|Issue)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const issueMatch = cleanText.match(issueRegex);
    if (issueMatch) {
        result.dateOfIssue = issueMatch[1];
    }

    // Date of Expiry
    const expiryRegex = new RegExp(`(?:วันหมดอายุ|Expiry)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const expiryMatch = cleanText.match(expiryRegex);
    if (expiryMatch) {
        result.dateOfExpiry = expiryMatch[1];
    }

    return result;
  },

  /**
   * Convert PDF buffer to Image Buffer (First Page)
   * Uses local Poppler binaries in backend/poppler/
   */
  async _convertPdfToImage(pdfBuffer) {
    // Define path to local Windows binary
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
          try { await fs.remove(tempPdfPath); } catch (e) {}

          if (error.code === 'ENOENT') {
             return reject(new Error(`Poppler binary not found at ${popplerPath}. Please ensure backend/poppler contains pdftocairo.exe`));
          }
          if (process.platform !== 'win32') {
             return reject(new Error('Local Poppler binary execution failed. This configuration is intended for Windows environments using the bundled .exe files.'));
          }
          return reject(new Error('Failed to convert PDF to image using local Poppler.'));
        }

        const expectedOutputPath = path.join(tempDir, `${outPrefix}-1.jpg`);

        if (await fs.pathExists(expectedOutputPath)) {
          try {
            const imageBuffer = await fs.readFile(expectedOutputPath);
            await fs.remove(tempPdfPath);
            await fs.remove(expectedOutputPath);
            resolve(imageBuffer);
          } catch (readErr) {
            reject(new Error('Failed to read converted image file.'));
          }
        } else {
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
