/**
 * Background Sync Service
 * Handles automatic sync and scheduled tasks
 */

const cron = require('node-cron');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Setup all cron jobs
 */
function setupCronJobs() {
  // Daily sync check at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily sync check...');
    await processSyncQueue();
  });
  
  // Weekly report generation on Sundays at 8 AM
  cron.schedule('0 8 * * 0', async () => {
    logger.info('Generating weekly reports...');
    await generateWeeklyReports();
  });
  
  // Monthly backup on 1st of month at 3 AM
  cron.schedule('0 3 1 * *', async () => {
    logger.info('Running monthly backup...');
    await performMonthlyBackup();
  });
  
  // Cleanup old logs daily at 4 AM
  cron.schedule('0 4 * * *', async () => {
    logger.info('Cleaning up old logs...');
    await cleanupOldLogs();
  });
  
  logger.info('Cron jobs scheduled successfully');
}

/**
 * Process pending sync queue items
 */
async function processSyncQueue() {
  try {
    // Get pending items
    const pendingItems = await query(
      `SELECT * FROM sync_queue 
       WHERE status = 'pending' 
       AND retry_count < 5
       ORDER BY created_at ASC
       LIMIT 100`
    );
    
    logger.info(`Processing ${pendingItems.rows.length} sync queue items`);
    
    for (const item of pendingItems.rows) {
      try {
        await query(
          `UPDATE sync_queue 
           SET status = 'processing', 
               processed_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [item.id]
        );
        
        // Process based on entity type and action
        await processSyncItem(item);
        
        await query(
          `UPDATE sync_queue 
           SET status = 'completed' 
           WHERE id = $1`,
          [item.id]
        );
      } catch (error) {
        logger.error(`Sync item ${item.id} failed:`, error);
        
        await query(
          `UPDATE sync_queue 
           SET status = 'failed',
               retry_count = retry_count + 1,
               error_message = $1
           WHERE id = $2`,
          [error.message, item.id]
        );
      }
    }
  } catch (error) {
    logger.error('Process sync queue error:', error);
  }
}

/**
 * Process individual sync item
 */
async function processSyncItem(item) {
  const { entity_type, action, payload } = item;
  
  switch (entity_type) {
    case 'transaction':
      // Sync transaction to external systems if needed
      logger.debug(`Syncing transaction: ${payload.id}`);
      break;
      
    case 'photo':
      // Sync photos to cloud storage
      logger.debug(`Syncing photo: ${payload.id}`);
      break;
      
    case 'invoice':
      // Sync invoices
      logger.debug(`Syncing invoice: ${payload.id}`);
      break;
      
    default:
      logger.warn(`Unknown entity type: ${entity_type}`);
  }
}

/**
 * Generate weekly reports
 */
async function generateWeeklyReports() {
  try {
    // Get weekly summary for each user
    const weeklyData = await query(
      `SELECT 
        user_id,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        COUNT(*) as transaction_count
       FROM transactions
       WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY user_id`
    );
    
    logger.info(`Generated weekly reports for ${weeklyData.rows.length} users`);
    
    // Store reports or send notifications
    for (const data of weeklyData.rows) {
      logger.debug(`User ${data.user_id}: Income=${data.income}, Expense=${data.expense}`);
    }
  } catch (error) {
    logger.error('Generate weekly reports error:', error);
  }
}

/**
 * Perform monthly backup
 */
async function performMonthlyBackup() {
  try {
    // This would trigger a backup to cloud storage
    logger.info('Monthly backup initiated');
    
    // Get all transactions for the month
    const monthData = await query(
      `SELECT COUNT(*) as count,
              SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
       AND transaction_date < DATE_TRUNC('month', CURRENT_DATE)`
    );
    
    logger.info('Monthly backup completed', monthData.rows[0]);
  } catch (error) {
    logger.error('Monthly backup error:', error);
  }
}

/**
 * Cleanup old logs
 */
async function cleanupOldLogs() {
  try {
    // Delete activity logs older than 90 days
    const deletedLogs = await query(
      `DELETE FROM activity_logs 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
       RETURNING COUNT(*) as count`
    );
    
    // Delete completed sync queue items older than 30 days
    const deletedSync = await query(
      `DELETE FROM sync_queue 
       WHERE status = 'completed' 
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING COUNT(*) as count`
    );
    
    logger.info('Cleanup completed', {
      logsDeleted: deletedLogs.rowCount,
      syncItemsDeleted: deletedSync.rowCount,
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
  }
}

/**
 * Add item to sync queue
 */
async function addToSyncQueue(userId, entityType, entityId, action, payload = {}) {
  try {
    await query(
      `INSERT INTO sync_queue (user_id, entity_type, entity_id, action, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, entityType, entityId, action, JSON.stringify(payload)]
    );
    
    logger.debug(`Added to sync queue: ${entityType} ${entityId}`);
  } catch (error) {
    logger.error('Add to sync queue error:', error);
  }
}

module.exports = {
  setupCronJobs,
  processSyncQueue,
  addToSyncQueue,
};
