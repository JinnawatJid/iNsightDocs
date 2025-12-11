const express = require('express');
const cors = require('cors');
const db = require('./db');
const customerRoutes = require('./routes/customerRoutes');
const creditRequestRoutes = require('./routes/creditRequestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
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

const startServer = async () => {
  await db.initialize();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
