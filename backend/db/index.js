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

async function initDb() {
  await pool.query(`
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
  `);

  await pool.query(`
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature TEXT;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_breakdowns (
      id SERIAL PRIMARY KEY,
      invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
      daily_rental_days INT,
      daily_rental_rate NUMERIC(10, 2),
      excess_reduction_days INT,
      excess_reduction_rate NUMERIC(10, 2),
      registration_recovery_days INT,
      registration_recovery_rate NUMERIC(10, 2),
      delivery_charge NUMERIC(10, 2),
      sub_total NUMERIC(10, 2) NOT NULL,
      gst NUMERIC(10, 2) NOT NULL,
      grand_total NUMERIC(10, 2) NOT NULL
    )
  `);
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDb,
};
