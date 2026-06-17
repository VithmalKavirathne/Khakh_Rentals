-- Repairer centers for invoice dropdown (admin-managed)
CREATE TABLE IF NOT EXISTS repairers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repairers_is_active ON repairers (is_active);

INSERT INTO repairers (name)
VALUES
    ('EPPING ACCIDENT REPAIR CENTER'),
    ('ALZAKS PANELS')
ON CONFLICT (name) DO NOTHING;
