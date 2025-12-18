const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const customerRoutes = require('./routes/customerRoutes');
const creditRequestRoutes = require('./routes/creditRequestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/credit-requests', creditRequestRoutes);

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

// Serve Static Frontend Files (Vue.js)
// Logic: If 'dist' folder exists at the parent level (../dist), serve it.
const distPath = path.join(__dirname, '../dist');

app.use(express.static(distPath));

// SPA Fallback: Send index.html for any unknown route (that isn't /api)
app.get('*', (req, res) => {
  // Only serve index.html if it exists, otherwise send 404
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
        if (!res.headersSent) {
            res.status(404).send('Frontend not built or not found. Ensure ../dist exists.');
        }
    }
  });
});

const startServer = async () => {
  await db.initialize();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Serving frontend from: ${distPath}`);
  });
};

startServer();
