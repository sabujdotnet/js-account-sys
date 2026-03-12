/**
 * Dashboard Routes
 * Analytics and summary data
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @GET /api/dashboard/summary
 * Get dashboard summary
 */
router.get('/summary', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Build user filter based on role
    let userFilter = '';
    const params = [];
    
    if (userRole === 'engineer') {
      userFilter = 'WHERE user_id = $1';
      params.push(userId);
    }
    
    // Get today's transactions
    const todayResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       ${userFilter}
       ${userFilter ? 'AND' : 'WHERE'} transaction_date = CURRENT_DATE`,
      params
    );
    
    // Get this month's transactions
    const monthResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       ${userFilter}
       ${userFilter ? 'AND' : 'WHERE'} transaction_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      params
    );
    
    // Get total counts
    const countsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM transactions ${userFilter}) as total_transactions,
        (SELECT COUNT(*) FROM projects ${userRole === 'engineer' ? 'WHERE created_by = $1' : ''}) as total_projects,
        (SELECT COUNT(*) FROM workers ${userFilter}) as total_workers,
        (SELECT COUNT(*) FROM invoices ${userFilter}) as total_invoices`,
      params
    );
    
    // Get pending labor payments
    const pendingLaborResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM labor_payments
       WHERE is_paid = false
       ${userRole === 'engineer' ? 'AND user_id = $1' : ''}`,
      params
    );
    
    // Get overdue invoices
    const overdueInvoicesResult = await query(
      `SELECT COALESCE(SUM(balance_due), 0) as total, COUNT(*) as count
       FROM invoices
       WHERE status = 'sent' AND due_date < CURRENT_DATE
       ${userRole === 'engineer' ? 'AND user_id = $1' : ''}`,
      params
    );
    
    res.json({
      success: true,
      data: {
        today: {
          income: parseFloat(todayResult.rows[0].income),
          expense: parseFloat(todayResult.rows[0].expense),
        },
        thisMonth: {
          income: parseFloat(monthResult.rows[0].income),
          expense: parseFloat(monthResult.rows[0].expense),
        },
        counts: {
          transactions: parseInt(countsResult.rows[0].total_transactions),
          projects: parseInt(countsResult.rows[0].total_projects),
          workers: parseInt(countsResult.rows[0].total_workers),
          invoices: parseInt(countsResult.rows[0].total_invoices),
        },
        pendingLabor: parseFloat(pendingLaborResult.rows[0].total),
        overdueInvoices: {
          amount: parseFloat(overdueInvoicesResult.rows[0].total),
          count: parseInt(overdueInvoicesResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    logger.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard summary.',
    });
  }
});

/**
 * @GET /api/dashboard/charts/monthly
 * Get monthly transaction data for charts
 */
router.get('/charts/monthly', authenticate, allRoles, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let userFilter = '';
    const params = [year];
    
    if (userRole === 'engineer') {
      userFilter = 'AND user_id = $2';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE EXTRACT(YEAR FROM transaction_date) = $1
       ${userFilter}
       GROUP BY EXTRACT(MONTH FROM transaction_date)
       ORDER BY month`,
      params
    );
    
    // Fill in missing months with zeros
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
      income: 0,
      expense: 0,
    }));
    
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month) - 1;
      monthlyData[monthIndex].income = parseFloat(row.income);
      monthlyData[monthIndex].expense = parseFloat(row.expense);
    });
    
    res.json({
      success: true,
      data: monthlyData,
    });
  } catch (error) {
    logger.error('Monthly chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly chart data.',
    });
  }
});

/**
 * @GET /api/dashboard/charts/category
 * Get expense breakdown by category
 */
router.get('/charts/category', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let userFilter = '';
    const params = [];
    
    if (userRole === 'engineer') {
      userFilter = 'AND user_id = $1';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT 
        category,
        SUM(amount) as total
       FROM transactions
       WHERE type = 'expense'
       ${userFilter}
       AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY category
       ORDER BY total DESC`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
      })),
    });
  } catch (error) {
    logger.error('Category chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category chart data.',
    });
  }
});

/**
 * @GET /api/dashboard/recent-transactions
 * Get recent transactions
 */
router.get('/recent-transactions', authenticate, allRoles, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let userFilter = '';
    const params = [limit];
    
    if (userRole === 'engineer') {
      userFilter = 'WHERE t.user_id = $2';
      params.push(userId);
    }
    
    const result = await query(
      `SELECT t.*, p.name as project_name, u.name as user_name
       FROM transactions t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.user_id = u.id
       ${userFilter}
       ORDER BY t.created_at DESC
       LIMIT $1`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Recent transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent transactions.',
    });
  }
});

/**
 * @GET /api/dashboard/project-status
 * Get project status overview
 */
router.get('/project-status', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause = '';
    const params = [];
    
    if (userRole === 'engineer') {
      whereClause = 'WHERE created_by = $1';
      params.push(userId);
    }
    
    // Get projects by status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM projects
       ${whereClause}
       GROUP BY status`,
      params
    );
    
    // Get recent projects
    const recentResult = await query(
      `SELECT p.*, 
              (SELECT COUNT(*) FROM transactions WHERE project_id = p.id) as transaction_count,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE project_id = p.id AND type = 'expense') as total_expense
       FROM projects p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT 5`,
      params
    );
    
    res.json({
      success: true,
      data: {
        byStatus: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        recent: recentResult.rows,
      },
    });
  } catch (error) {
    logger.error('Project status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project status.',
    });
  }
});

/**
 * @GET /api/dashboard/financial-overview
 * Get comprehensive financial overview
 */
router.get('/financial-overview', authenticate, allRoles, async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'week', 'month', 'year'
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "transaction_date >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "transaction_date >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
      default:
        dateFilter = "transaction_date >= DATE_TRUNC('month', CURRENT_DATE)";
    }
    
    let userFilter = '';
    const params = [];
    
    if (userRole === 'engineer') {
      userFilter = 'AND user_id = $1';
      params.push(userId);
    }
    
    // Income vs Expense
    const overviewResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
       FROM transactions
       WHERE ${dateFilter}
       ${userFilter}`,
      params
    );
    
    // Top expense categories
    const topExpensesResult = await query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE type = 'expense' AND ${dateFilter}
       ${userFilter}
       GROUP BY category
       ORDER BY total DESC
       LIMIT 5`,
      params
    );
    
    // Daily trend
    const dailyTrendResult = await query(
      `SELECT 
        transaction_date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE ${dateFilter}
       ${userFilter}
       GROUP BY transaction_date
       ORDER BY transaction_date`,
      params
    );
    
    const overview = overviewResult.rows[0];
    
    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalIncome: parseFloat(overview.total_income),
          totalExpense: parseFloat(overview.total_expense),
          netProfit: parseFloat(overview.total_income) - parseFloat(overview.total_expense),
          incomeCount: parseInt(overview.income_count),
          expenseCount: parseInt(overview.expense_count),
        },
        topExpenses: topExpensesResult.rows.map(row => ({
          category: row.category,
          total: parseFloat(row.total),
        })),
        dailyTrend: dailyTrendResult.rows.map(row => ({
          date: row.transaction_date,
          income: parseFloat(row.income),
          expense: parseFloat(row.expense),
        })),
      },
    });
  } catch (error) {
    logger.error('Financial overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial overview.',
    });
  }
});

/**
 * @GET /api/dashboard/alerts
 * Get dashboard alerts
 */
router.get('/alerts', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const alerts = [];
    let params = [];
    let userFilter = '';
    
    if (userRole === 'engineer') {
      userFilter = 'AND user_id = $1';
      params.push(userId);
    }
    
    // Check for overdue invoices
    const overdueResult = await query(
      `SELECT COUNT(*) as count
       FROM invoices
       WHERE status = 'sent' AND due_date < CURRENT_DATE
       ${userFilter}`,
      params
    );
    
    if (parseInt(overdueResult.rows[0].count) > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Invoices',
        message: `You have ${overdueResult.rows[0].count} overdue invoice(s).`,
        link: '/invoices?status=overdue',
      });
    }
    
    // Check for pending labor payments
    const pendingLaborResult = await query(
      `SELECT COUNT(*) as count
       FROM labor_payments
       WHERE is_paid = false
       ${userFilter}`,
      params
    );
    
    if (parseInt(pendingLaborResult.rows[0].count) > 0) {
      alerts.push({
        type: 'info',
        title: 'Pending Labor Payments',
        message: `You have ${pendingLaborResult.rows[0].count} pending labor payment(s).`,
        link: '/labor',
      });
    }
    
    // Check for low budget projects (expenses > 90% of budget)
    const budgetResult = await query(
      `SELECT p.name, p.budget,
              COALESCE(SUM(t.amount), 0) as spent
       FROM projects p
       LEFT JOIN transactions t ON p.id = t.project_id AND t.type = 'expense'
       WHERE p.status = 'active' AND p.budget > 0
       ${userRole === 'engineer' ? 'AND p.created_by = $1' : ''}
       GROUP BY p.id, p.name, p.budget
       HAVING COALESCE(SUM(t.amount), 0) > p.budget * 0.9`,
      params
    );
    
    budgetResult.rows.forEach(row => {
      alerts.push({
        type: 'error',
        title: 'Budget Alert',
        message: `Project "${row.name}" has exceeded 90% of its budget.`,
        link: '/projects',
      });
    });
    
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Dashboard alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alerts.',
    });
  }
});

module.exports = router;
