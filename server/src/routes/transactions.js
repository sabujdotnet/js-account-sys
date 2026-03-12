/**
 * Transaction Routes
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/transactions
 * Get all transactions
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const {
      type,
      category,
      projectId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (userRole === 'engineer') {
      whereClause += ` AND t.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (type) {
      whereClause += ` AND t.type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (category) {
      whereClause += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (projectId) {
      whereClause += ` AND t.project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    
    if (startDate) {
      whereClause += ` AND t.transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND t.transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (search) {
      whereClause += ` AND (t.description ILIKE $${paramIndex} OR t.category ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get transactions
    const transactionsResult = await query(
      `SELECT t.*, 
              p.name as project_name,
              u.name as user_name,
              json_agg(
                json_build_object(
                  'id', ph.id,
                  'type', ph.type,
                  'filePath', ph.file_path
                )
              ) FILTER (WHERE ph.id IS NOT NULL) as photos
       FROM transactions t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN photos ph ON t.id = ph.transaction_id
       ${whereClause}
       GROUP BY t.id, p.name, u.name
       ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        transactions: transactionsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions.',
    });
  }
});

/**
 * @GET /api/transactions/:id
 * Get single transaction
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = 'WHERE t.id = $1';
    const params = [id];
    
    if (userRole === 'engineer') {
      whereClause += ' AND t.user_id = $2';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT t.*, 
              p.name as project_name,
              u.name as user_name,
              json_agg(
                json_build_object(
                  'id', ph.id,
                  'type', ph.type,
                  'filePath', ph.file_path,
                  'description', ph.description
                )
              ) FILTER (WHERE ph.id IS NOT NULL) as photos
       FROM transactions t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN photos ph ON t.id = ph.transaction_id
       ${whereClause}
       GROUP BY t.id, p.name, u.name`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction.',
    });
  }
});

/**
 * @POST /api/transactions
 * Create new transaction
 */
router.post('/', authenticate, allRoles, async (req, res) => {
  try {
    const {
      type,
      category,
      subcategory,
      amount,
      description,
      transactionDate,
      projectId,
      vatRate = 0,
      photoIds = [],
    } = req.body;
    
    const userId = req.user.id;
    
    // Validation
    if (!type || !category || !amount || !description || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'Type, category, amount, description, and transaction date are required.',
      });
    }
    
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either income or expense.',
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0.',
      });
    }
    
    // Calculate VAT
    const vatAmount = (amount * vatRate) / 100;
    
    const result = await query(
      `INSERT INTO transactions 
       (user_id, project_id, type, category, subcategory, amount, 
        description, transaction_date, vat_amount, vat_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        projectId || null,
        type,
        category,
        subcategory || null,
        amount,
        description,
        transactionDate,
        vatAmount,
        vatRate,
      ]
    );
    
    const transaction = result.rows[0];
    
    // Link photos if provided
    if (photoIds.length > 0) {
      await query(
        `UPDATE photos 
         SET transaction_id = $1 
         WHERE id = ANY($2) AND user_id = $3`,
        [transaction.id, photoIds, userId]
      );
    }
    
    logger.info(`Transaction created by ${req.user.email}: ${transaction.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully.',
      data: transaction,
    });
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction.',
    });
  }
});

/**
 * @PUT /api/transactions/:id
 * Update transaction
 */
router.put('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      category,
      subcategory,
      amount,
      description,
      transactionDate,
      projectId,
      vatRate,
    } = req.body;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check ownership
    const transactionCheck = await query(
      'SELECT user_id FROM transactions WHERE id = $1',
      [id]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }
    
    if (transactionCheck.rows[0].user_id !== userId && 
        !['director', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }
    
    // Calculate new VAT if amount or rate changed
    let vatAmount = null;
    if (amount !== undefined && vatRate !== undefined) {
      vatAmount = (amount * vatRate) / 100;
    }
    
    const result = await query(
      `UPDATE transactions 
       SET type = COALESCE($1, type),
           category = COALESCE($2, category),
           subcategory = COALESCE($3, subcategory),
           amount = COALESCE($4, amount),
           description = COALESCE($5, description),
           transaction_date = COALESCE($6, transaction_date),
           project_id = COALESCE($7, project_id),
           vat_rate = COALESCE($8, vat_rate),
           vat_amount = COALESCE($9, vat_amount),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        type,
        category,
        subcategory,
        amount,
        description,
        transactionDate,
        projectId,
        vatRate,
        vatAmount,
        id,
      ]
    );
    
    logger.info(`Transaction updated by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Transaction updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction.',
    });
  }
});

/**
 * @DELETE /api/transactions/:id
 * Delete transaction
 */
router.delete('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check ownership
    const transactionCheck = await query(
      'SELECT user_id FROM transactions WHERE id = $1',
      [id]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }
    
    if (transactionCheck.rows[0].user_id !== userId && 
        !['director', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }
    
    await query('DELETE FROM transactions WHERE id = $1', [id]);
    
    logger.info(`Transaction deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction.',
    });
  }
});

/**
 * @GET /api/transactions/summary/by-category
 * Get transactions summary by category
 */
router.get('/summary/by-category', authenticate, allRoles, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (userRole === 'engineer') {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (startDate) {
      whereClause += ` AND transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const result = await query(
      `SELECT 
        category,
        type,
        COUNT(*) as count,
        SUM(amount) as total
       FROM transactions
       ${whereClause}
       GROUP BY category, type
       ORDER BY total DESC`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary.',
    });
  }
});

module.exports = router;
