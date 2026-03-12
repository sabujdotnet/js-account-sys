/**
 * Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { generateToken, authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @POST /api/auth/register
 * Register a new user (Director/Manager only)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role = 'engineer' } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required.',
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      });
    }
    
    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }
    
    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.',
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), passwordHash, name, phone, role]
    );
    
    const user = result.rows[0];
    const token = generateToken(user);
    
    logger.info(`New user registered: ${email} (${role})`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
});

/**
 * @POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }
    
    // Find user
    const result = await query(
      `SELECT id, email, password_hash, name, phone, role, is_active, avatar_url
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }
    
    // Update last login
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Generate token
    const token = generateToken(user);
    
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'LOGIN',
        JSON.stringify({ email: user.email }),
        req.ip,
        req.headers['user-agent'],
      ]
    );
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
});

/**
 * @GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, phone, role, avatar_url, is_active, 
              last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatar_url,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile.',
    });
  }
});

/**
 * @PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const userId = req.user.id;
    
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, name, phone, role, avatar_url`,
      [name, phone, avatarUrl, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
});

/**
 * @POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }
    
    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password_hash
    );
    
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );
    
    logger.info(`Password changed for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
    });
  }
});

/**
 * @POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'LOGOUT', JSON.stringify({ email: req.user.email })]
    );
    
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed.',
    });
  }
});

module.exports = router;
