const express = require('express');
const cors = require('cors');
const path = require('path'); // Added path module
const morgan = require('morgan');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const db = require('./db');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/authMiddleware');
const customerRoutes = require('./routes/customerRoutes');
const creditRequestRoutes = require('./routes/creditRequestRoutes');
const financialRoutes = require('./routes/financialRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const externalRoutes = require('./routes/externalRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: true, // or your frontend domain
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Setup HTTP request logging via Winston
app.use(morgan(':method :url :status - :response-time ms', { stream: logger.stream })); // Log to Winston

// Public Authentication Routes
app.use('/api/auth', authRoutes);

// TODO: Implement Role-Based Access Control (RBAC) middleware for protected routes
// TODO: Implement proper JWT signature validation (using JWKS) for token verification
// TODO: Secure auth token cookie (HttpOnly, Secure, SameSite) to prevent XSS/CSRF

// Routes (Protected with Auth Middleware)
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/credit-requests', authMiddleware, creditRequestRoutes);
app.use('/api/financials', authMiddleware, financialRoutes);
app.use('/api/ocr', authMiddleware, ocrRoutes);

// External Routes (Should typically have their own API key protection, not user JWT)
app.use('/api/external', externalRoutes);

// Serve downloaded files
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads')));

// Configuration Endpoint (Public)
app.get('/api/config/auth', (req, res) => {
    // Check if authentication is enabled via environment variable
    // Default to true for safety if the variable is not explicitly set to 'false'
    const isAuthEnabled = process.env.ENABLE_AUTH !== 'false';
    const projectCreditEnabled = process.env.ENABLE_PROJECT_CREDIT === 'true';
    const additionalDocumentsEnabled = process.env.ENABLE_ADDITIONAL_DOCUMENTS === 'true';

    res.status(200).json({
      authRequired: isAuthEnabled,
      projectCreditEnabled: projectCreditEnabled,
      additionalDocumentsEnabled: additionalDocumentsEnabled
    });
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Simple query to verify DB connection
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    logger.error('Health check failed:', error);
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
    logger.info(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
