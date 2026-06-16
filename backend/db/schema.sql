-- Khakh Rentals — full PostgreSQL schema (Option A)
-- Billing totals live on billing_breakdowns, not invoices.
-- For Supabase: run this file on a fresh DB, or run migrations/001_fix_invoice_schema.sql on existing DB.

-- 1. Drivers / Customers
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    street_address VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(50),
    post_code VARCHAR(20),
    home_phone VARCHAR(50),
    mobile_phone VARCHAR(50) NOT NULL,
    work_phone VARCHAR(50),
    dob DATE,
    email VARCHAR(255),
    licence_no VARCHAR(100) NOT NULL,
    state_of_issue VARCHAR(50),
    licence_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    colour VARCHAR(50),
    registration VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Invoices (header + rental + repairer + third-party + inspection + signature)
--    Does NOT store billing line items — see billing_breakdowns.
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    third_party_claim_no VARCHAR(100),
    invoice_date DATE NOT NULL,
    client_registration VARCHAR(100),

    driver_id INT REFERENCES drivers(id),
    vehicle_id INT REFERENCES vehicles(id),

    date_out DATE,
    time_out TIME,
    date_return DATE,
    time_return TIME,
    kms_out INT,
    kms_return INT,
    excess_amount NUMERIC(10, 2),
    total_days INT,

    repairer_name VARCHAR(255),
    repairer_phone VARCHAR(50),

    tp_insurance_company VARCHAR(255),
    tp_claim_number VARCHAR(100),
    tp_driver_name VARCHAR(255),
    tp_damaged_vehicle_rego VARCHAR(50),
    tp_date_of_accident DATE,

    inspection_fuel_level VARCHAR(50),
    inspection_fuel_type VARCHAR(50),
    inspection_condition VARCHAR(255),
    inspector_name VARCHAR(255),

    signature TEXT,
    acknowledged BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Billing breakdowns (one row per invoice; joined for list/detail totals)
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
);

CREATE INDEX IF NOT EXISTS idx_billing_breakdowns_invoice_id
    ON billing_breakdowns(invoice_id);

-- 5. Deleted invoices archive
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
);
