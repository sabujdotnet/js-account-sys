/**
 * Authentication & Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }
    
    // Check if user still exists and is active
    const userResult = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
}

/**
 * Role-based authorization middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role,
      });
    }
    
    next();
  };
}

/**
 * Director only middleware
 */
const directorOnly = authorize('director');

/**
 * Manager and above middleware
 */
const managerAndAbove = authorize('director', 'manager');

/**
 * All authenticated users
 */
const allRoles = authorize('director', 'manager', 'engineer');

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      const userResult = await query(
        'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
        req.user = userResult.rows[0];
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  directorOnly,
  managerAndAbove,
  allRoles,
  optionalAuth,
};
