const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

console.log(`Starting static server on port ${PORT}`);
console.log(`Proxying /api requests to ${BACKEND_URL}`);

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // We do NOT rewrite the path because the backend expects /api prefixes
    // e.g. /api/customers -> http://backend:3000/api/customers
}));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: For any other request, send index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend server is running at http://localhost:${PORT}`);
});
