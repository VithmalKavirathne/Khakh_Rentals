-- Migration 001: Align Supabase with Option A (billing on billing_breakdowns)
-- Run manually in Supabase SQL Editor, or automatically on backend startup via initDb().
--
-- Architecture:
--   invoices          = invoice header, rental, repairer, third-party, inspection, signature
--   billing_breakdowns = all monetary line items and totals (one row per invoice)

-- ---------------------------------------------------------------------------
-- 1. Invoices: columns the backend INSERT/UPDATE actually uses (27 columns)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Remove legacy billing columns wrongly placed on invoices (old backend)
--    Safe: only drops if they exist; canonical billing stays on billing_breakdowns
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices DROP COLUMN IF EXISTS daily_days;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS daily_rate;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS delivery_charge;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS rego_days;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS rego_rate;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS sub_total;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS gst;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS total_amount;

-- ---------------------------------------------------------------------------
-- 3. Billing breakdowns (canonical billing storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_breakdowns (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES public.invoices(id) ON DELETE CASCADE,
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
    ON public.billing_breakdowns(invoice_id);

-- ---------------------------------------------------------------------------
-- 4. Deleted invoices archive (used by DELETE /api/invoices/:id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_invoices (
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
