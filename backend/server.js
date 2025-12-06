const express = require('express');
const cors = require('cors');
const db = require('./db');
const customerRoutes = require('./routes/customerRoutes');
const creditRequestRoutes = require('./routes/creditRequestRoutes');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/credit-requests', creditRequestRoutes);

// OCR Endpoint
app.post('/api/ocr/analyze', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // Multer saves files without extensions. We need the extension for the Python script
  // to correctly detect if it's a PDF or Image.
  const originalExt = path.extname(req.file.originalname);
  const oldPath = req.file.path;
  const newPath = `${oldPath}${originalExt}`;

  // Rename the file to include the extension
  try {
    fs.renameSync(oldPath, newPath);
  } catch (err) {
    console.error('Error renaming file:', err);
    return res.status(500).json({ success: false, error: 'Failed to process file upload' });
  }

  const filePath = newPath;
  const pythonScript = path.join(__dirname, 'ocr_engine.py');

  // Use 'python' instead of 'python3' for better Windows compatibility
  // (Assuming 'python' is in the system PATH)
  const process = spawn('python', [pythonScript, filePath]);

  let dataString = '';
  let errorString = '';

  process.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  process.stderr.on('data', (data) => {
    // EasyOCR/PyTorch often outputs warnings to stderr, which aren't necessarily fatal errors.
    // We'll log them but strictly rely on stdout JSON for the response.
    console.error(`OCR Stderr: ${data}`);
    errorString += data.toString();
  });

  process.on('close', (code) => {
    // Clean up the uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    if (code !== 0) {
      console.error(`OCR process exited with code ${code}`);
      return res.status(500).json({
        success: false,
        error: 'OCR process failed',
        details: errorString
      });
    }

    try {
      const result = JSON.parse(dataString);
      res.json(result);
    } catch (e) {
      console.error('Failed to parse OCR output:', dataString);
      res.status(500).json({
        success: false,
        error: 'Failed to parse OCR output',
        raw: dataString
      });
    }
  });
});

const startServer = async () => {
  await db.initialize();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
