/**
 * Database Migration Script
 * Creates all necessary tables
 */

const { pool } = require('./database');
const logger = require('../utils/logger');

const migrations = [
  // Users table with roles
  `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'engineer' CHECK (role IN ('director', 'manager', 'engineer')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Projects table
  `
  CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_email VARCHAR(255),
    budget DECIMAL(15, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Project members (many-to-many)
  `
  CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
  );
  `,

  // Transactions table
  `
  CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 0,
    receipt_url TEXT,
    is_synced BOOLEAN DEFAULT true,
    sync_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Photos table (receipts and handwriting notes)
  `
  CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receipt', 'handwriting_note', 'site_photo', 'document')),
    original_name VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(50),
    description TEXT,
    ocr_text TEXT,
    is_synced BOOLEAN DEFAULT true,
    google_drive_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Workers table
  `
  CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    daily_rate DECIMAL(10, 2) DEFAULT 0,
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Labor payments table
  `
  CREATE TABLE IF NOT EXISTS labor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5, 2) DEFAULT 0,
    days_worked INTEGER DEFAULT 1,
    rate DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Invoices table
  `
  CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_address TEXT,
    buyer_phone VARCHAR(20),
    buyer_email VARCHAR(255),
    buyer_bin VARCHAR(50),
    subtotal DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 15,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Invoice items table
  `
  CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL
  );
  `,

  // Budgets table
  `
  CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_estimated DECIMAL(15, 2) DEFAULT 0,
    total_actual DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Budget items table
  `
  CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    estimated_amount DECIMAL(15, 2) NOT NULL,
    actual_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT
  );
  `,

  // Sync queue table (for background sync)
  `
  CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
  );
  `,

  // Activity logs table
  `
  CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Google Drive tokens table
  `
  CREATE TABLE IF NOT EXISTS drive_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // Settings table
  `
  CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    UNIQUE(user_id, key)
  );
  `,

  // Create indexes for better performance
  `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);`,
  `CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_photos_transaction_id ON photos(transaction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_labor_payments_worker_id ON labor_payments(worker_id);`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);`,
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database migrations...');
    
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      try {
        await client.query(migration);
        logger.info(`Migration ${i + 1}/${migrations.length} completed`);
      } catch (error) {
        logger.error(`Migration ${i + 1} failed:`, error.message);
        throw error;
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
