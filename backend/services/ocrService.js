const axios = require('axios');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OCR_MODEL = process.env.OCR_MODEL || 'scb10x/typhoon-ocr1.5-3b';
// Default to MOCK being true if not explicitly set to 'false', for safety in dev/testing
const USE_MOCK = process.env.MOCK_OCR !== 'false';

/**
 * Service to handle OCR extraction from images via Ollama/Typhoon
 */
const ocrService = {
  /**
   * Extract data from a Thai ID card image
   * @param {Buffer} imageBuffer - The image file buffer
   * @returns {Promise<Object>} - Extracted data object
   */
  async extractThaiID(imageBuffer) {
    if (USE_MOCK) {
      console.log('OCR Service: Using MOCK mode');
      return this._getMockData();
    }

    try {
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

      // Typhon/Ollama usually returns .response in the body
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
      console.error('OCR Service: Error calling Ollama', error.message);
      // Fallback to mock if the connection fails (optional, but good for stability during setup)
      // For now, we throw to let the controller handle it
      if (error.code === 'ECONNREFUSED') {
         throw new Error('Ollama service is not reachable. Please ensure Ollama is running.');
      }
      throw error;
    }
  },

  /**
   * Returns mock data for testing purposes
   */
  _getMockData() {
    return new Promise((resolve) => {
      // Simulate network delay
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
