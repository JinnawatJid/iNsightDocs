// Middleware to check for API Key
const apiKeyAuth = (req, res, next) => {
    // Get key from header
    const apiKey = req.header('X-API-KEY');

    // Check if key is present
    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    }

    // Check if key matches environment variable
    let validKey = process.env.EXTERNAL_API_KEY;

    // In production, strictly require the environment variable
    if (process.env.NODE_ENV === 'production') {
        if (!validKey) {
            console.error('CRITICAL: EXTERNAL_API_KEY is not set in production environment.');
            return res.status(500).json({ error: 'Server Configuration Error' });
        }
    } else {
        // In dev/test, use a fallback if not set
        if (!validKey) {
            console.warn('WARNING: EXTERNAL_API_KEY is not set. Using default "dev-api-key" for development.');
            validKey = 'dev-api-key';
        }
    }

    if (apiKey !== validKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    next();
};

module.exports = apiKeyAuth;
