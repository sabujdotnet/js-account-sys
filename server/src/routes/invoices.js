/**
 * Invoices Routes
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/invoices
 * Get all invoices
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (userRole === 'engineer') {
      whereClause += ` AND i.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    const invoicesResult = await query(
      `SELECT i.*, p.name as project_name
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        invoices: invoicesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoices.',
    });
  }
});

/**
 * @GET /api/invoices/:id
 * Get single invoice
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceResult = await query(
      `SELECT i.*, p.name as project_name
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.id = $1`,
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }
    
    const itemsResult = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...invoiceResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice.',
    });
  }
});

/**
 * @POST /api/invoices
 * Create new invoice
 */
router.post('/', authenticate, allRoles, async (req, res) => {
  try {
    const {
      projectId,
      buyerName,
      buyerAddress,
      buyerPhone,
      buyerEmail,
      buyerBin,
      items,
      discountPercent = 0,
      vatRate = 15,
      issueDate,
      dueDate,
      notes,
      terms,
    } = req.body;
    
    const userId = req.user.id;
    
    // Calculate totals
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += item.quantity * item.unitPrice;
    });
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const amountAfterDiscount = subtotal - discountAmount;
    const vatAmount = (amountAfterDiscount * vatRate) / 100;
    const totalAmount = amountAfterDiscount + vatAmount;
    
    // Generate invoice number
    const date = new Date();
    const invoiceNumber = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    const result = await transaction(async (client) => {
      // Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices 
         (user_id, project_id, invoice_number, buyer_name, buyer_address, buyer_phone, 
          buyer_email, buyer_bin, subtotal, discount_amount, discount_percent, 
          vat_amount, vat_rate, total_amount, issue_date, due_date, notes, terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          userId,
          projectId || null,
          invoiceNumber,
          buyerName,
          buyerAddress,
          buyerPhone,
          buyerEmail,
          buyerBin,
          subtotal,
          discountAmount,
          discountPercent,
          vatAmount,
          vatRate,
          totalAmount,
          issueDate,
          dueDate,
          notes,
          terms,
        ]
      );
      
      const invoice = invoiceResult.rows[0];
      
      // Create invoice items
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoice.id,
            item.description,
            item.quantity,
            item.unit,
            item.unitPrice,
            item.quantity * item.unitPrice,
          ]
        );
      }
      
      return invoice;
    });
    
    logger.info(`Invoice created by ${req.user.email}: ${result.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      data: result,
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice.',
    });
  }
});

/**
 * @PUT /api/invoices/:id/status
 * Update invoice status
 */
router.put('/:id/status', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amountPaid } = req.body;
    
    const result = await query(
      `UPDATE invoices 
       SET status = $1,
           amount_paid = COALESCE($2, amount_paid),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, amountPaid, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }
    
    res.json({
      success: true,
      message: 'Invoice status updated.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice status.',
    });
  }
});

/**
 * @DELETE /api/invoices/:id
 * Delete invoice
 */
router.delete('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM invoices WHERE id = $1', [id]);
    
    logger.info(`Invoice deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice.',
    });
  }
});

module.exports = router;
