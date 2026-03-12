/**
 * Backup Routes
 * Google Drive integration and manual backup
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const googleDrive = require('../services/googleDrive');
const logger = require('../utils/logger');

/**
 * @GET /api/backup/status
 * Get backup status
 */
router.get('/status', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check Google Drive connection
    const isDriveConnected = await googleDrive.isDriveConnected(userId);
    
    // Get last backup info
    const lastBackup = await query(
      `SELECT created_at 
       FROM activity_logs 
       WHERE user_id = $1 AND action = 'BACKUP_COMPLETED'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    // Get storage stats
    const photosResult = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as size FROM photos WHERE user_id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        googleDrive: {
          connected: isDriveConnected,
        },
        lastBackup: lastBackup.rows[0]?.created_at || null,
        storage: {
          photosCount: parseInt(photosResult.rows[0].count),
          photosSize: parseInt(photosResult.rows[0].size),
        },
      },
    });
  } catch (error) {
    logger.error('Get backup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status.',
    });
  }
});

/**
 * @GET /api/backup/google/auth
 * Get Google Drive authorization URL
 */
router.get('/google/auth', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const authUrl = googleDrive.getAuthUrl(userId);
    
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    logger.error('Get Google auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get authorization URL.',
    });
  }
});

/**
 * @GET /api/backup/google/callback
 * Google Drive OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid callback parameters.',
      });
    }
    
    // Exchange code for tokens
    const tokens = await googleDrive.exchangeCodeForTokens(code);
    
    // Save tokens
    await googleDrive.saveTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
    
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'GOOGLE_DRIVE_CONNECTED', JSON.stringify({})]
    );
    
    logger.info(`Google Drive connected for user: ${userId}`);
    
    // Redirect to client
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/settings?googleDrive=connected`);
  } catch (error) {
    logger.error('Google callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/settings?googleDrive=error`);
  }
});

/**
 * @POST /api/backup/google/disconnect
 * Disconnect Google Drive
 */
router.post('/google/disconnect', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await googleDrive.disconnectDrive(userId);
    
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'GOOGLE_DRIVE_DISCONNECTED', JSON.stringify({})]
    );
    
    res.json({
      success: true,
      message: 'Google Drive disconnected successfully.',
    });
  } catch (error) {
    logger.error('Disconnect Google Drive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Drive.',
    });
  }
});

/**
 * @POST /api/backup/google/backup
 * Trigger Google Drive backup
 */
router.post('/google/backup', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if connected
    const isConnected = await googleDrive.isDriveConnected(userId);
    
    if (!isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive not connected.',
      });
    }
    
    // Perform backup
    const backupResult = await googleDrive.backupDatabaseToDrive(userId);
    
    // Upload photos
    const photosResult = await googleDrive.uploadPhotosToDrive(userId);
    
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'BACKUP_COMPLETED', JSON.stringify({ driveId: backupResult.id })]
    );
    
    res.json({
      success: true,
      message: 'Backup completed successfully.',
      data: {
        backup: backupResult,
        photos: photosResult,
      },
    });
  } catch (error) {
    logger.error('Google Drive backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup to Google Drive.',
    });
  }
});

/**
 * @POST /api/backup/export
 * Export data as JSON
 */
router.post('/export', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const { includePhotos = false } = req.body;
    
    // Get user's data
    const transactions = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    const workers = await query(
      'SELECT * FROM workers WHERE user_id = $1',
      [userId]
    );
    
    const laborPayments = await query(
      'SELECT * FROM labor_payments WHERE user_id = $1',
      [userId]
    );
    
    const invoices = await query(
      'SELECT * FROM invoices WHERE user_id = $1',
      [userId]
    );
    
    const projects = await query(
      'SELECT * FROM projects WHERE created_by = $1',
      [userId]
    );
    
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        transactions: transactions.rows,
        workers: workers.rows,
        laborPayments: laborPayments.rows,
        invoices: invoices.rows,
        projects: projects.rows,
      },
    };
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `js-accounting-export-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(backupData);
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data.',
    });
  }
});

/**
 * @POST /api/backup/import
 * Import data from JSON
 */
router.post('/import', authenticate, allRoles, async (req, res) => {
  try {
    const userId = req.user.id;
    const backupData = req.body;
    
    // Validate backup data
    if (!backupData || !backupData.data) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup data.',
      });
    }
    
    const { data } = backupData;
    const imported = {
      transactions: 0,
      workers: 0,
      laborPayments: 0,
      invoices: 0,
      projects: 0,
    };
    
    // Import transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const transaction of data.transactions) {
        try {
          await query(
            `INSERT INTO transactions 
             (user_id, project_id, type, category, subcategory, amount, 
              description, transaction_date, vat_amount, vat_rate)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              userId,
              transaction.project_id,
              transaction.type,
              transaction.category,
              transaction.subcategory,
              transaction.amount,
              transaction.description,
              transaction.transaction_date,
              transaction.vat_amount || 0,
              transaction.vat_rate || 0,
            ]
          );
          imported.transactions++;
        } catch (err) {
          logger.warn('Failed to import transaction:', err.message);
        }
      }
    }
    
    // Import workers
    if (data.workers && Array.isArray(data.workers)) {
      for (const worker of data.workers) {
        try {
          await query(
            `INSERT INTO workers (user_id, name, phone, hourly_rate, daily_rate, role)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              worker.name,
              worker.phone,
              worker.hourly_rate,
              worker.daily_rate,
              worker.role,
            ]
          );
          imported.workers++;
        } catch (err) {
          logger.warn('Failed to import worker:', err.message);
        }
      }
    }
    
    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'DATA_IMPORTED', JSON.stringify(imported)]
    );
    
    res.json({
      success: true,
      message: 'Data imported successfully.',
      data: imported,
    });
  } catch (error) {
    logger.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import data.',
    });
  }
});

module.exports = router;
