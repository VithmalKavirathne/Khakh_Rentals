const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { getAdminPasswordHash } = require('../config/authEnv');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

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

exports.login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body || {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const identifier = String(usernameOrEmail).trim();
    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const adminPasswordHash = getAdminPasswordHash();

    if (adminUsername && identifier.toLowerCase() === adminUsername.toLowerCase()) {
      if (!adminPasswordHash) {
        console.error('ADMIN_PASSWORD_HASH or ADMIN_PASSWORD_HASH_B64 is not configured');
        return res.status(500).json({ error: 'Admin login is not configured' });
      }

      const validAdmin = await bcrypt.compare(password, adminPasswordHash);
      if (!validAdmin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const adminUser = {
        id: 'admin',
        fullName: 'Administrator',
        email: adminUsername,
        phone: null,
        role: 'admin',
      };

      const token = signToken(adminUser);
      return res.json({ token, user: adminUser });
    }

    const result = await db.query(
      `SELECT id, full_name, email, phone, password_hash, role, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];

    if (!row.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone || null,
      role: row.role,
    };

    const token = signToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  try {
    if (req.user.id === 'admin') {
      return res.json({
        user: {
          id: 'admin',
          fullName: 'Administrator',
          email: req.user.email,
          phone: null,
          role: 'admin',
        },
      });
    }

    const result = await db.query(
      `SELECT id, full_name, email, phone, role, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    return res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    console.error('Auth me error:', error.message);
    return res.status(500).json({ error: 'Failed to load session' });
  }
};
