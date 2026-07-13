/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Organizations
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255) UNIQUE,
      logo_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Alter Users
    ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

    -- 3. Document Version History
    CREATE TABLE IF NOT EXISTS document_versions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      file_url TEXT NOT NULL,
      changes_summary TEXT,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Billing Transactions
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      stripe_invoice_id VARCHAR(100) UNIQUE,
      amount_cents INT NOT NULL,
      status VARCHAR(20) NOT NULL, -- 'paid', 'pending', 'failed'
      invoice_pdf_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id UUID,
      ip_address VARCHAR(45),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS billing_invoices;
    DROP TABLE IF EXISTS document_versions;
    ALTER TABLE users 
      DROP COLUMN IF EXISTS organization_id,
      DROP COLUMN IF EXISTS stripe_customer_id,
      DROP COLUMN IF EXISTS subscription_tier,
      DROP COLUMN IF EXISTS is_deleted,
      DROP COLUMN IF EXISTS deleted_at;
    DROP TABLE IF EXISTS organizations;
  `);
};
