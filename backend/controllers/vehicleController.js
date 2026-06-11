const db = require('../db');

// GET /api/vehicles -> list all registered vehicles
exports.listVehicles = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, make, model, colour, registration, created_at
             FROM vehicles
             ORDER BY created_at DESC, id DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing vehicles:', error);
        res.status(500).json({ error: 'Failed to load vehicles' });
    }
};

// GET /api/vehicles/:registration -> look up one vehicle (used for invoice auto-fill)
exports.getVehicleByRegistration = async (req, res) => {
    try {
        const registration = (req.params.registration || '').trim();
        if (!registration) {
            return res.status(400).json({ error: 'Registration is required' });
        }
        const result = await db.query(
            `SELECT id, make, model, colour, registration
             FROM vehicles
             WHERE LOWER(registration) = LOWER($1)`,
            [registration]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: 'Failed to look up vehicle' });
    }
};

// POST /api/vehicles -> register a vehicle (updates details if the rego already exists)
exports.registerVehicle = async (req, res) => {
    try {
        const { make, model, colour, registration } = req.body || {};

        if (!registration || !registration.trim()) {
            return res.status(400).json({ error: 'Registration is required' });
        }
        if (!make || !make.trim() || !model || !model.trim()) {
            return res.status(400).json({ error: 'Make and Model are required' });
        }

        const result = await db.query(
            `INSERT INTO vehicles (make, model, colour, registration)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (registration) DO UPDATE SET
                make = EXCLUDED.make,
                model = EXCLUDED.model,
                colour = EXCLUDED.colour
             RETURNING id, make, model, colour, registration, created_at`,
            [make.trim(), model.trim(), (colour || '').trim(), registration.trim()]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error registering vehicle:', error);
        res.status(500).json({ error: 'Failed to register vehicle' });
    }
};

// DELETE /api/vehicles/:id -> remove a registered vehicle
exports.deleteVehicle = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        // Vehicle is referenced by an invoice (foreign key) -> cannot delete
        if (error.code === '23503') {
            return res.status(409).json({ error: 'This vehicle is used by one or more invoices and cannot be deleted.' });
        }
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
};
