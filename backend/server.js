const express = require('express');
const cors = require('cors');
const path = require('path'); // Added path module
const morgan = require('morgan');
const fs = require('fs');
const db = require('./db');
const customerRoutes = require('./routes/customerRoutes');
const creditRequestRoutes = require('./routes/creditRequestRoutes');
const financialRoutes = require('./routes/financialRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const externalRoutes = require('./routes/externalRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure logs directory exists
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Setup access logging
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream })); // Log to file
app.use(morgan('dev')); // Log to console

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/credit-requests', creditRequestRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/external', externalRoutes);

// Serve downloaded files
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads')));

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Simple query to verify DB connection
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing: Serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const startServer = async () => {
  await db.initialize();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
