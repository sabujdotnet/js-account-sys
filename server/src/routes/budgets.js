/**
 * Budgets Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/budgets
 * Get all budgets
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = '';
    const params = [];
    
    if (userRole === 'engineer') {
      whereClause = 'WHERE b.user_id = $1';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT b.*, p.name as project_name
       FROM budgets b
       LEFT JOIN projects p ON b.project_id = p.id
       ${whereClause}
       ORDER BY b.created_at DESC`,
      params
    );
    
    res.json({
      success: true,
      data: {
        budgets: result.rows,
      },
    });
  } catch (error) {
    logger.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budgets.',
    });
  }
});

/**
 * @GET /api/budgets/:id
 * Get single budget
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    const budgetResult = await query(
      `SELECT b.*, p.name as project_name
       FROM budgets b
       LEFT JOIN projects p ON b.project_id = p.id
       WHERE b.id = $1`,
      [id]
    );
    
    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found.',
      });
    }
    
    const itemsResult = await query(
      'SELECT * FROM budget_items WHERE budget_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...budgetResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget.',
    });
  }
});

/**
 * @POST /api/budgets
 * Create new budget
 */
router.post('/', authenticate, allRoles, async (req, res) => {
  try {
    const {
      projectId,
      name,
      description,
      items,
    } = req.body;
    
    const userId = req.user.id;
    
    // Calculate total estimated
    const totalEstimated = items.reduce((sum, item) => sum + item.estimatedAmount, 0);
    
    const result = await query(
      `INSERT INTO budgets (user_id, project_id, name, description, total_estimated)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, projectId || null, name, description, totalEstimated]
    );
    
    const budget = result.rows[0];
    
    // Create budget items
    for (const item of items) {
      await query(
        `INSERT INTO budget_items (budget_id, category, subcategory, description, estimated_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [budget.id, item.category, item.subcategory, item.description, item.estimatedAmount]
      );
    }
    
    logger.info(`Budget created by ${req.user.email}: ${budget.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Budget created successfully.',
      data: budget,
    });
  } catch (error) {
    logger.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget.',
    });
  }
});

/**
 * @PUT /api/budgets/:id
 * Update budget
 */
router.put('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    const result = await query(
      `UPDATE budgets 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found.',
      });
    }
    
    res.json({
      success: true,
      message: 'Budget updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget.',
    });
  }
});

/**
 * @DELETE /api/budgets/:id
 * Delete budget
 */
router.delete('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM budgets WHERE id = $1', [id]);
    
    logger.info(`Budget deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Budget deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget.',
    });
  }
});

module.exports = router;
