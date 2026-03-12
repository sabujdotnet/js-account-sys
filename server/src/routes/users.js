/**
 * User Management Routes
 * For Director and Manager roles
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, directorOnly, managerAndAbove } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/users
 * Get all users (Manager and above)
 */
router.get('/', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (role) {
      whereClause += ` AND role = $${paramIndex++}`;
      params.push(role);
    }
    
    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get users
    const usersResult = await query(
      `SELECT id, email, name, phone, role, is_active, avatar_url,
              last_login_at, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users.',
    });
  }
});

/**
 * @GET /api/users/:id
 * Get user by ID (Manager and above)
 */
router.get('/:id', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT id, email, name, phone, role, is_active, avatar_url,
              last_login_at, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user.',
    });
  }
});

/**
 * @POST /api/users
 * Create new user (Manager and above)
 */
router.post('/', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { email, password, name, phone, role = 'engineer' } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required.',
      });
    }
    
    // Only director can create managers
    if (role === 'manager' && req.user.role !== 'director') {
      return res.status(403).json({
        success: false,
        message: 'Only directors can create manager accounts.',
      });
    }
    
    // Check if email exists
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
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, phone, role, is_active, created_at`,
      [email.toLowerCase(), passwordHash, name, phone, role]
    );
    
    logger.info(`User created by ${req.user.email}: ${email} (${role})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user.',
    });
  }
});

/**
 * @PUT /api/users/:id
 * Update user (Manager and above)
 */
router.put('/:id', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive } = req.body;
    
    // Check if user exists
    const userCheck = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    const targetUser = userCheck.rows[0];
    
    // Only director can change roles or modify managers
    if ((role || targetUser.role === 'manager') && req.user.role !== 'director') {
      return res.status(403).json({
        success: false,
        message: 'Only directors can change roles or modify managers.',
      });
    }
    
    // Cannot modify own role through this endpoint
    if (id === req.user.id && role && role !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own role.',
      });
    }
    
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           role = COALESCE($3, role),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, name, phone, role, is_active, updated_at`,
      [name, phone, role, isActive, id]
    );
    
    logger.info(`User updated by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'User updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user.',
    });
  }
});

/**
 * @DELETE /api/users/:id
 * Delete user (Director only)
 */
router.delete('/:id', authenticate, directorOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cannot delete self
    if (id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account.',
      });
    }
    
    // Check if user exists
    const userCheck = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    // Delete user (cascade will handle related records)
    await query('DELETE FROM users WHERE id = $1', [id]);
    
    logger.info(`User deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
    });
  }
});

/**
 * @POST /api/users/:id/reset-password
 * Reset user password (Director only)
 */
router.post('/:id/reset-password', authenticate, directorOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }
    
    // Check if user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );
    
    logger.info(`Password reset by ${req.user.email} for user: ${id}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
    });
  }
});

/**
 * @GET /api/users/stats/overview
 * Get user statistics (Manager and above)
 */
router.get('/stats/overview', authenticate, managerAndAbove, async (req, res) => {
  try {
    // Get user counts by role
    const roleStats = await query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       WHERE is_active = true
       GROUP BY role`
    );
    
    // Get total users
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM users'
    );
    
    // Get active users (logged in within last 30 days)
    const activeResult = await query(
      `SELECT COUNT(*) as active 
       FROM users 
       WHERE last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'`
    );
    
    // Get new users this month
    const newResult = await query(
      `SELECT COUNT(*) as new_users 
       FROM users 
       WHERE created_at > DATE_TRUNC('month', CURRENT_DATE)`
    );
    
    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
        newThisMonth: parseInt(newResult.rows[0].new_users),
        byRole: roleStats.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics.',
    });
  }
});

module.exports = router;
