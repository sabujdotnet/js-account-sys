/**
 * Project Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, allRoles, managerAndAbove } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/projects
 * Get all projects
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (userRole === 'engineer') {
      whereClause += ` AND (p.created_by = $${paramIndex} OR pm.user_id = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.client_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT p.id) 
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get projects with stats
    const projectsResult = await query(
      `SELECT p.*, 
              u.name as created_by_name,
              COALESCE(t.total_expense, 0) as total_expense,
              COALESCE(t.total_income, 0) as total_income,
              COALESCE(t.transaction_count, 0) as transaction_count,
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', pm2.user_id,
                  'name', u2.name,
                  'role', pm2.role
                )
              ) FILTER (WHERE pm2.user_id IS NOT NULL) as members
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN project_members pm2 ON p.id = pm2.project_id
       LEFT JOIN users u2 ON pm2.user_id = u2.id
       LEFT JOIN (
         SELECT project_id,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                COUNT(*) as transaction_count
         FROM transactions
         GROUP BY project_id
       ) t ON p.id = t.project_id
       ${whereClause}
       GROUP BY p.id, u.name, t.total_expense, t.total_income, t.transaction_count
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        projects: projectsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get projects.',
    });
  }
});

/**
 * @GET /api/projects/:id
 * Get single project
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = 'WHERE p.id = $1';
    const params = [id];
    
    if (userRole === 'engineer') {
      whereClause += ' AND (p.created_by = $2 OR pm.user_id = $2)';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT p.*, 
              u.name as created_by_name,
              COALESCE(t.total_expense, 0) as total_expense,
              COALESCE(t.total_income, 0) as total_income,
              COALESCE(t.transaction_count, 0) as transaction_count,
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', pm2.user_id,
                  'name', u2.name,
                  'role', pm2.role
                )
              ) FILTER (WHERE pm2.user_id IS NOT NULL) as members
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN project_members pm2 ON p.id = pm2.project_id
       LEFT JOIN users u2 ON pm2.user_id = u2.id
       LEFT JOIN (
         SELECT project_id,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                COUNT(*) as transaction_count
         FROM transactions
         GROUP BY project_id
       ) t ON p.id = t.project_id
       ${whereClause}
       GROUP BY p.id, u.name, t.total_expense, t.total_income, t.transaction_count`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project.',
    });
  }
});

/**
 * @POST /api/projects
 * Create new project
 */
router.post('/', authenticate, managerAndAbove, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      clientName,
      clientPhone,
      clientEmail,
      budget,
      startDate,
      endDate,
      memberIds = [],
    } = req.body;
    
    const userId = req.user.id;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required.',
      });
    }
    
    // Create project
    const projectResult = await query(
      `INSERT INTO projects 
       (name, description, address, client_name, client_phone, client_email, 
        budget, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        description,
        address,
        clientName,
        clientPhone,
        clientEmail,
        budget || 0,
        startDate,
        endDate,
        userId,
      ]
    );
    
    const project = projectResult.rows[0];
    
    // Add members
    for (const memberId of memberIds) {
      await query(
        'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
        [project.id, memberId]
      );
    }
    
    logger.info(`Project created by ${req.user.email}: ${project.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: project,
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project.',
    });
  }
});

/**
 * @PUT /api/projects/:id
 * Update project
 */
router.put('/:id', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      address,
      clientName,
      clientPhone,
      clientEmail,
      budget,
      startDate,
      endDate,
      status,
    } = req.body;
    
    const result = await query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           address = COALESCE($3, address),
           client_name = COALESCE($4, client_name),
           client_phone = COALESCE($5, client_phone),
           client_email = COALESCE($6, client_email),
           budget = COALESCE($7, budget),
           start_date = COALESCE($8, start_date),
           end_date = COALESCE($9, end_date),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name,
        description,
        address,
        clientName,
        clientPhone,
        clientEmail,
        budget,
        startDate,
        endDate,
        status,
        id,
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }
    
    logger.info(`Project updated by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Project updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project.',
    });
  }
});

/**
 * @DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM projects WHERE id = $1', [id]);
    
    logger.info(`Project deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project.',
    });
  }
});

/**
 * @POST /api/projects/:id/members
 * Add member to project
 */
router.post('/:id/members', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: memberId, role = 'member' } = req.body;
    
    await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [id, memberId, role]
    );
    
    res.json({
      success: true,
      message: 'Member added successfully.',
    });
  } catch (error) {
    logger.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member.',
    });
  }
});

/**
 * @DELETE /api/projects/:id/members/:userId
 * Remove member from project
 */
router.delete('/:id/members/:userId', authenticate, managerAndAbove, async (req, res) => {
  try {
    const { id, userId: memberId } = req.params;
    
    await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, memberId]
    );
    
    res.json({
      success: true,
      message: 'Member removed successfully.',
    });
  } catch (error) {
    logger.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member.',
    });
  }
});

module.exports = router;
