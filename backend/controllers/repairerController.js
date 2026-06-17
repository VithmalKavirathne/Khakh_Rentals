const db = require('../db');

function toPublicRepairer(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.listRepairers = async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';

    const result = await db.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM repairers
       ${includeInactive ? '' : 'WHERE is_active = true'}
       ORDER BY name ASC`
    );

    return res.json({ repairers: result.rows.map(toPublicRepairer) });
  } catch (error) {
    console.error('List repairers error:', error.message);
    return res.status(500).json({ error: 'Failed to load repairers' });
  }
};

exports.createRepairer = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Repairer name is required' });
    }

    const result = await db.query(
      `INSERT INTO repairers (name)
       VALUES ($1)
       RETURNING id, name, is_active, created_at, updated_at`,
      [name]
    );

    return res.status(201).json({ repairer: toPublicRepairer(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A repairer with this name already exists' });
    }
    console.error('Create repairer error:', error.message);
    return res.status(500).json({ error: 'Failed to create repairer' });
  }
};

exports.updateRepairer = async (req, res) => {
  try {
    const repairerId = Number(req.params.id);
    if (!Number.isInteger(repairerId) || repairerId <= 0) {
      return res.status(400).json({ error: 'Invalid repairer id' });
    }

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const isActive = req.body?.isActive;

    const fields = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      if (!name) {
        return res.status(400).json({ error: 'Repairer name cannot be empty' });
      }
      fields.push(`name = $${index++}`);
      values.push(name);
    }

    if (isActive !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(Boolean(isActive));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(repairerId);

    const result = await db.query(
      `UPDATE repairers SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING id, name, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repairer not found' });
    }

    return res.json({ repairer: toPublicRepairer(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A repairer with this name already exists' });
    }
    console.error('Update repairer error:', error.message);
    return res.status(500).json({ error: 'Failed to update repairer' });
  }
};

exports.deactivateRepairer = async (req, res) => {
  try {
    const repairerId = Number(req.params.id);
    if (!Number.isInteger(repairerId) || repairerId <= 0) {
      return res.status(400).json({ error: 'Invalid repairer id' });
    }

    const result = await db.query(
      `UPDATE repairers
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_active, created_at, updated_at`,
      [repairerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repairer not found' });
    }

    return res.json({ repairer: toPublicRepairer(result.rows[0]) });
  } catch (error) {
    console.error('Deactivate repairer error:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate repairer' });
  }
};
