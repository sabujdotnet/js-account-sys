/**
 * Database Seed Script
 * Creates initial admin user and sample data
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./database');
const logger = require('../utils/logger');

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database seeding...');
    
    // Check if admin user exists
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@jsaccounting.com']
    );
    
    if (adminCheck.rows.length === 0) {
      // Create admin user (director)
      const adminPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@jsaccounting.com', adminPassword, 'System Administrator', '01700000000', 'director', true]
      );
      logger.info('Admin user created: admin@jsaccounting.com / admin123');
    }
    
    // Check if demo manager exists
    const managerCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['manager@jsaccounting.com']
    );
    
    if (managerCheck.rows.length === 0) {
      const managerPassword = await bcrypt.hash('manager123', 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['manager@jsaccounting.com', managerPassword, 'Demo Manager', '01700000001', 'manager', true]
      );
      logger.info('Manager user created: manager@jsaccounting.com / manager123');
    }
    
    // Check if demo engineer exists
    const engineerCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['engineer@jsaccounting.com']
    );
    
    if (engineerCheck.rows.length === 0) {
      const engineerPassword = await bcrypt.hash('engineer123', 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['engineer@jsaccounting.com', engineerPassword, 'Demo Engineer', '01700000002', 'engineer', true]
      );
      logger.info('Engineer user created: engineer@jsaccounting.com / engineer123');
    }
    
    // Create sample project
    const projectCheck = await client.query(
      'SELECT id FROM projects WHERE name = $1',
      ['Sample Residential Project']
    );
    
    if (projectCheck.rows.length === 0) {
      const adminResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@jsaccounting.com']
      );
      
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].id;
        
        await client.query(
          `INSERT INTO projects (name, description, address, client_name, client_phone, budget, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'Sample Residential Project',
            'A 1200 sqft residential building project in Dhaka',
            '123 Main Road, Dhaka-1200',
            'Sample Client',
            '01812345678',
            1500000,
            'active',
            adminId
          ]
        );
        logger.info('Sample project created');
      }
    }
    
    logger.info('Database seeding completed');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
