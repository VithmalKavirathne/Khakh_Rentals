const bcrypt = require('bcrypt');
const db = require('../db');

const SALT_ROUNDS = 12;
const ALLOWED_ROLES = new Set(['admin', 'user']);

function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || null,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.listUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, email, phone, role, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json({ users: result.rows.map(toPublicUser) });
  } catch (error) {
    console.error('List users error:', error.message);
    return res.status(500).json({ error: 'Failed to load users' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const userRole = role || 'user';
    if (!ALLOWED_ROLES.has(userRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, is_active, created_at, updated_at`,
      [String(fullName).trim(), String(email).trim().toLowerCase(), phone || null, passwordHash, userRole]
    );

    return res.status(201).json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    console.error('Create user error:', error.message);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { fullName, email, phone, role, isActive, password } = req.body || {};
    const fields = [];
    const values = [];
    let index = 1;

    if (fullName !== undefined) {
      fields.push(`full_name = $${index++}`);
      values.push(String(fullName).trim());
    }
    if (email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(String(email).trim().toLowerCase());
    }
    if (phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(phone || null);
    }
    if (role !== undefined) {
      if (!ALLOWED_ROLES.has(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      fields.push(`role = $${index++}`);
      values.push(role);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(Boolean(isActive));
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push(`password_hash = $${index++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING id, full_name, email, phone, role, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    console.error('Update user error:', error.message);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const result = await db.query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, email, phone, role, is_active, created_at, updated_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    console.error('Deactivate user error:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate user' });
  }
};
