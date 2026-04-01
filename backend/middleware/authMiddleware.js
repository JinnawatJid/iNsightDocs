const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // Check if authentication is enabled via environment variable
    // Default to true for safety if the variable is not explicitly set to 'false'
    const isAuthEnabled = process.env.ENABLE_AUTH !== 'false';

    if (!isAuthEnabled) {
        // Read the requested developer role from cookies, fallback to standard mock role
        const devRole = (req.cookies && req.cookies.dev_role) ? req.cookies.dev_role : "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)";

        // Mock user payload so backend routes don't crash when trying to access req.user
        req.user = {
            userId: 99999,
            username: "DEV_MODE_USER",
            empname: "Dev User Name",
            roles: [
                {
                    app: "Smart Credit Application",
                    role: devRole
                }
            ],
            branchCode: "00TR"
        };
        return next();
    }

    try {
        let token = null;

        // 1. Check Authorization header (Bearer token)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // 2. Fallback to token cookie
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
        }

        // Decode the token without verifying the RS256 signature for now
        // This gives us access to the payload data (e.g., userId, username, roles, branchCode)
        const decoded = jwt.decode(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
        }

        // Even though we aren't verifying the signature, we should still manually verify the token hasn't expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && currentTime > decoded.exp) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Token has expired' });
        }

        // Attach decoded user info to the request
        req.user = decoded;

        // Ensure user is associated with this specific app if needed
        const appRoles = decoded.roles || [];
        const isAuthorizedApp = appRoles.some(r => r.app === 'Smart Credit Application');

        if (!isAuthorizedApp && appRoles.length > 0) {
           logger.warn('User does not have explicit role for Smart Credit Application:', decoded.username);
           // Not blocking for now, but logged for monitoring
        }

        next();
    } catch (error) {
        logger.error('Authentication Error:', error);
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
