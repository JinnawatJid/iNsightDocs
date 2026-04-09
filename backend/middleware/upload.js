const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // We will move files to the final destination in the controller
    // For now, save to a temp directory
    const UPLOAD_BASE = process.env.UPLOAD_PATH
        ? path.resolve(process.cwd(), process.env.UPLOAD_PATH)
        : path.join(__dirname, '../uploads');

    const tempDir = path.join(UPLOAD_BASE, 'temp');

    fs.ensureDirSync(tempDir);
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Fix for Thai characters (UTF-8 encoded by browser, interpreted as Latin-1 by multer/busboy)
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // Keep original name but prepend timestamp to avoid collisions in temp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Allowed MIME types
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel' // .xls
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, PDF, and Excel files are allowed.'));
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit per file
  fileFilter: fileFilter
});

module.exports = upload;
