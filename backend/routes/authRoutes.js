const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Endpoint to fetch current user's info based on their HttpOnly token cookie
router.get('/me', (req, res) => {
    // Check if authentication is enabled via environment variable
    const isAuthEnabled = process.env.ENABLE_AUTH !== 'false';

    if (!isAuthEnabled) {
        // Dev mode mock user
        return res.status(200).json({
            user: {
                userId: 99999,
                username: "DEV_MODE_USER",
                roles: [
                    {
                        app: "Smart Credit Application",
                        role: "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)"
                    }
                ],
                branchCode: "00TR"
            }
        });
    }

    try {
        let token = null;

        // Check Authorization header or cookies for token
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
        }

        // Decode the token without verifying the RS256 signature for now
        const decoded = jwt.decode(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && currentTime > decoded.exp) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Token has expired' });
        }

        // Return user data explicitly
        res.status(200).json({
            user: {
                userId: decoded.userId,
                username: decoded.username,
                roles: decoded.roles,
                branchCode: decoded.branchCode
            }
        });
    } catch (error) {
        console.error('Authentication Error (/me):', error);
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
    }
});

router.post('/logout', (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true, // Should match how the cookie was originally set
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Adjust based on your original cookie settings
        path: '/'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
