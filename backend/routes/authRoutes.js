const express = require('express');
const router = express.Router();

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
