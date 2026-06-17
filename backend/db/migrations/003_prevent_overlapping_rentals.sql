-- Optional database-level safety: prevent overlapping rentals for the same vehicle.
-- Run in Supabase SQL Editor ONLY after confirming no overlapping rows exist:
--
--   SELECT a.id, a.invoice_no, a.date_out, a.date_return, b.id, b.invoice_no
--   FROM invoices a
--   JOIN invoices b ON a.vehicle_id = b.vehicle_id AND a.id < b.id
--   WHERE a.date_out IS NOT NULL AND a.date_return IS NOT NULL
--     AND b.date_out IS NOT NULL AND b.date_return IS NOT NULL
--     AND a.date_out <= b.date_return AND a.date_return >= b.date_out;
--
-- If that query returns rows, fix or delete duplicates before applying this migration.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_rental_dates
    ON invoices (vehicle_id, date_out, date_return);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_no_overlapping_rentals'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT invoices_no_overlapping_rentals
        EXCLUDE USING gist (
            vehicle_id WITH =,
            daterange(date_out, date_return, '[]') WITH &&
        )
        WHERE (
            vehicle_id IS NOT NULL
            AND date_out IS NOT NULL
            AND date_return IS NOT NULL
        );
    END IF;
END $$;
