const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, (req, res) => {
    // If the request passes the authMiddleware, req.user will contain the decoded token payload
    res.status(200).json({ user: req.user });
});

router.post('/logout', (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
