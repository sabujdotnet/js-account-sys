/**
 * Workers Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/workers
 * Get all workers
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = '';
    const params = [];
    
    if (userRole === 'engineer') {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT w.*, p.name as project_name
       FROM workers w
       LEFT JOIN projects p ON w.project_id = p.id
       ${whereClause}
       ORDER BY w.created_at DESC`,
      params
    );
    
    res.json({
      success: true,
      data: {
        workers: result.rows,
      },
    });
  } catch (error) {
    logger.error('Get workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workers.',
    });
  }
});

/**
 * @GET /api/workers/:id
 * Get single worker
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT w.*, p.name as project_name
       FROM workers w
       LEFT JOIN projects p ON w.project_id = p.id
       WHERE w.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found.',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Get worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get worker.',
    });
  }
});

/**
 * @POST /api/workers
 * Create new worker
 */
router.post('/', authenticate, allRoles, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      hourlyRate,
      dailyRate,
      role,
      projectId,
    } = req.body;
    
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Worker name is required.',
      });
    }
    
    const result = await query(
      `INSERT INTO workers (user_id, project_id, name, phone, address, hourly_rate, daily_rate, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, projectId || null, name, phone, address, hourlyRate || 0, dailyRate || 0, role]
    );
    
    logger.info(`Worker created by ${req.user.email}: ${result.rows[0].id}`);
    
    res.status(201).json({
      success: true,
      message: 'Worker created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Create worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create worker.',
    });
  }
});

/**
 * @PUT /api/workers/:id
 * Update worker
 */
router.put('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      address,
      hourlyRate,
      dailyRate,
      role,
      isActive,
    } = req.body;
    
    const result = await query(
      `UPDATE workers 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           hourly_rate = COALESCE($4, hourly_rate),
           daily_rate = COALESCE($5, daily_rate),
           role = COALESCE($6, role),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, phone, address, hourlyRate, dailyRate, role, isActive, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found.',
      });
    }
    
    res.json({
      success: true,
      message: 'Worker updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker.',
    });
  }
});

/**
 * @DELETE /api/workers/:id
 * Delete worker
 */
router.delete('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM workers WHERE id = $1', [id]);
    
    logger.info(`Worker deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Worker deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete worker.',
    });
  }
});

module.exports = router;
