const jwt = require('jsonwebtoken');
const database = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'skyvoyage-jwt-secret-change-in-production';

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Verify JWT token
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

// Auth middleware
async function authMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.auth_token ||
                     req.session?.token;

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = verifyToken(token);
        
        // Get user from database
        const user = await database.get(
            'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account deactivated' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Role-based middleware
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Admin only middleware
const requireAdmin = requireRole(['admin']);

// Vendor only middleware
const requireVendor = requireRole(['vendor', 'admin']);

// User or above middleware
const requireUser = requireRole(['user', 'vendor', 'admin']);

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    requireRole,
    requireAdmin,
    requireVendor,
    requireUser
};