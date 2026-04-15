const logger = require('../utils/logger');

const checkIsAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Check if the user has the explicit admin role
    const roles = req.user.roles || [];
    const isAdmin = roles.some(r => r.role === 'ผู้ดูแลระบบ');

    if (!isAdmin) {
        logger.warn(`User ${req.user.username} (ID: ${req.user.userId}) attempted to access admin route without proper role.`);
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    next();
};

module.exports = checkIsAdmin;
