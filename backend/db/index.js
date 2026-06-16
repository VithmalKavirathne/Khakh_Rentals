const { Pool } = require('pg');

// Env loaded once in config/env.js before this module is required.
// Uses process.env.DATABASE_URL when set (Supabase on Hostinger), else local DB_* vars.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'khakh_rentals',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });

// Archive table for deleted invoices (keeps a separate log of removed records).
pool.query(`
  CREATE TABLE IF NOT EXISTS deleted_invoices (
    id SERIAL PRIMARY KEY,
    original_invoice_id INT,
    invoice_no VARCHAR(100),
    invoice_date DATE,
    driver_name VARCHAR(255),
    make VARCHAR(100),
    model VARCHAR(100),
    registration VARCHAR(50),
    total_amount NUMERIC(10, 2),
    data JSONB,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => console.error('Failed to ensure deleted_invoices table:', err.message));

// Store the customer's digital signature + acknowledgement on the invoice.
pool.query(`
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature TEXT;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
`).catch((err) => console.error('Failed to ensure invoice signature columns:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
