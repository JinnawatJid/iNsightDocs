const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // We will move files to the final destination in the controller
    // For now, save to a temp directory
    const tempDir = path.join(__dirname, '../../temp_uploads');
    fs.ensureDirSync(tempDir);
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Keep original name but prepend timestamp to avoid collisions in temp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Create multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

module.exports = upload;
