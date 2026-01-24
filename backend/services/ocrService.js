const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { execFile, spawn } = require('child_process');
const Tesseract = require('tesseract.js');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OCR_MODEL = process.env.OCR_MODEL || 'typhoon-ocr-lowmem';
const USE_MOCK = process.env.MOCK_OCR !== 'false';

const TYPHOON_PROMPT = `Extract all text from the image.

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
- Checkboxes: Use ☐ for unchecked and ☑ for checked boxes.`;

/**
 * Service to handle OCR extraction from images via Ollama/Typhoon
 */
const ocrService = {
  /**
   * Extract data from a Thai ID card (Image or PDF)
   */
  async extractThaiID(file) {
    if (USE_MOCK) {
      console.log('OCR Service: Using MOCK mode');
      return this._getMockData();
    }

    let imageBuffer = file.buffer;

    try {
      if (file.mimetype === 'application/pdf') {
         console.log('OCR Service: Detected PDF, converting to image...');
         imageBuffer = await this._convertPdfToImage(file.buffer);
      }

      console.log('OCR Service: Sending request to Ollama...');
      const rawText = await this._extractTyphoonRaw(imageBuffer);
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
      this._handleOllamaError(error);
      throw error;
    }
  },

  /**
   * Compare multiple OCR models
   */
  async compareModels(file) {
      // If mocking is enabled, return mock data for all 3
      if (USE_MOCK) {
          return {
              typhoon: { text: "Mock Typhoon Result\n(Line 2)", time: 1200, success: true },
              tesseract: { text: "Mock Tesseract Result", time: 500, success: true },
              easyocr: { text: "Mock EasyOCR Result", time: 2500, success: true }
          };
      }

      let imageBuffer = file.buffer;
      if (file.mimetype === 'application/pdf') {
         imageBuffer = await this._convertPdfToImage(file.buffer);
      }

      const results = {};

      // 1. Typhoon (Ollama)
      try {
          const start = Date.now();
          const text = await this._extractTyphoonRaw(imageBuffer);
          results.typhoon = { text, time: Date.now() - start, success: true };
      } catch (e) {
          results.typhoon = { error: e.message, success: false };
      }

      // 2. Tesseract
      try {
          const start = Date.now();
          const text = await this.extractTesseract(imageBuffer);
          results.tesseract = { text, time: Date.now() - start, success: true };
      } catch (e) {
          results.tesseract = { error: e.message, success: false };
      }

      // 3. EasyOCR
      try {
          const start = Date.now();
          const text = await this.extractEasyOCR(imageBuffer);
          results.easyocr = { text, time: Date.now() - start, success: true };
      } catch (e) {
           results.easyocr = { error: e.message, success: false };
      }

      return results;
  },

  /**
   * Internal helper to call Ollama/Typhoon
   */
  async _extractTyphoonRaw(imageBuffer) {
      const base64Image = imageBuffer.toString('base64');

      // Start Heartbeat logging
      const startTime = Date.now();
      const heartbeat = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`OCR Service: Waiting for Ollama... (${elapsed}s elapsed)`);
      }, 5000);

      try {
        const response = await axios.post(OLLAMA_URL, {
          model: OCR_MODEL,
          prompt: TYPHOON_PROMPT,
          images: [base64Image],
          stream: false
        });
        return response.data.response;
      } finally {
        clearInterval(heartbeat);
      }
  },

  /**
   * Tesseract.js extraction
   */
  async extractTesseract(imageBuffer) {
      // Note: This downloads language data on first run
      const result = await Tesseract.recognize(
        imageBuffer,
        'tha+eng',
        {
            // logger: m => console.log(m) // Optional logging
        }
      );
      return result.data.text;
  },

  /**
   * EasyOCR extraction via Python script
   */
  async extractEasyOCR(imageBuffer) {
      const tempDir = path.join(__dirname, '../../uploads/temp');
      await fs.ensureDir(tempDir);
      const tempFile = path.join(tempDir, `easyocr_${Date.now()}.jpg`);
      await fs.writeFile(tempFile, imageBuffer);

      try {
          const pythonScript = path.join(__dirname, '../scripts/run_easyocr.py');

          return new Promise((resolve, reject) => {
              const pythonProcess = spawn('python', [pythonScript, tempFile]);

              let output = '';
              let errorOutput = '';

              pythonProcess.stdout.on('data', (data) => {
                  output += data.toString();
              });

              pythonProcess.stderr.on('data', (data) => {
                  errorOutput += data.toString();
              });

              pythonProcess.on('close', (code) => {
                  // Cleanup
                  fs.remove(tempFile).catch(() => {});

                  if (code !== 0) {
                      reject(new Error(errorOutput || `EasyOCR exited with code ${code}`));
                  } else {
                      resolve(output);
                  }
              });

              pythonProcess.on('error', (err) => {
                  fs.remove(tempFile).catch(() => {});
                  reject(err);
              });
          });
      } catch (e) {
          await fs.remove(tempFile).catch(() => {});
          throw e;
      }
  },

  _handleOllamaError(error) {
      if (error.code === 'ECONNREFUSED') {
         throw new Error('Ollama service is not reachable. Please ensure Ollama is running.');
      }
      if (error.response && error.response.status === 500) {
        const errorData = error.response.data;
        if (typeof errorData === 'string' && errorData.includes('more system memory')) {
           throw new Error(`Model memory limit exceeded. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to install the optimized model.`);
        } else if (errorData && errorData.error && errorData.error.includes('more system memory')) {
           throw new Error(`Model memory limit exceeded. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to install the optimized model.`);
        }
      }
      if (error.response && error.response.status === 404) {
          throw new Error(`Model '${OCR_MODEL}' not found. Please run 'backend/scripts/setup_ocr_lowmem.ps1' to create it.`);
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

    const cleanText = text.replace(/\r\n/g, '\n');

    // 1. ID Number
    const idMatch = cleanText.match(/\b\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d\b/);
    if (idMatch) {
        result.idNumber = idMatch[0].replace(/[^0-9]/g, '');
    }

    // 2. Name
    const nameRegex = /(นางสาว|นาย|นาง|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.)\s*([^\s]+)\s+([^\s]+)/;
    const nameMatch = cleanText.match(nameRegex);
    if (nameMatch) {
        result.title = nameMatch[1];
        result.firstName = nameMatch[2];
        result.lastName = nameMatch[3];
    }

    // 3. Address
    const addressMatch = cleanText.match(/(?:ที่อยู่|Address)[^:\d]*[:\s]\s*([\s\S]+?)(?=\n.*(?:วัน|Date|Issue|Expiry|Religion|ศาสนา)|$)/i);
    if (addressMatch) {
        let addr = addressMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        result.address = addr;
    }

    // 4. Dates
    const datePattern = "([0-9]{1,2}\\s+[\\S]+\\s+[0-9]{4})";

    const dobRegex = new RegExp(`(?:เกิด|Birth)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const dobMatch = cleanText.match(dobRegex);
    if (dobMatch) {
        result.dateOfBirth = dobMatch[1];
    }

    const issueRegex = new RegExp(`(?:วันออกบัตร|Issue)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const issueMatch = cleanText.match(issueRegex);
    if (issueMatch) {
        result.dateOfIssue = issueMatch[1];
    }

    const expiryRegex = new RegExp(`(?:วันหมดอายุ|Expiry)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const expiryMatch = cleanText.match(expiryRegex);
    if (expiryMatch) {
        result.dateOfExpiry = expiryMatch[1];
    }

    return result;
  },

  /**
   * Convert PDF buffer to Image Buffer (First Page)
   */
  async _convertPdfToImage(pdfBuffer) {
    const popplerPath = path.join(__dirname, '../poppler/pdftocairo.exe');
    const tempDir = path.join(__dirname, '../../uploads/temp');
    await fs.ensureDir(tempDir);

    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);

    const outPrefix = path.basename(tempPdfPath, path.extname(tempPdfPath));
    const outPathPrefix = path.join(tempDir, outPrefix);

    const args = [
      '-jpeg',
      '-f', '1',
      '-l', '1',
      '-scale-to', '1024',
      tempPdfPath,
      outPathPrefix
    ];

    return new Promise((resolve, reject) => {
      console.log(`OCR Service: Executing local Poppler binary at ${popplerPath}`);

      execFile(popplerPath, args, async (error, stdout, stderr) => {
        if (error) {
          console.error('OCR Service: Poppler execution failed', stderr || error.message);
          try { await fs.remove(tempPdfPath); } catch (e) {}

          if (error.code === 'ENOENT') {
             return reject(new Error(`Poppler binary not found at ${popplerPath}.`));
          }
          if (process.platform !== 'win32') {
             return reject(new Error('Local Poppler binary execution failed.'));
          }
          return reject(new Error('Failed to convert PDF to image.'));
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
