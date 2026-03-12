/**
 * Database Configuration
 * PostgreSQL with Neon
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  logger.info('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

// Connect and verify
async function connectDB() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connection verified:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

// Query helper
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error:', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  connectDB,
  query,
  transaction,
};
