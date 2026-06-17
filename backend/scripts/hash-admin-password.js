#!/usr/bin/env node
/**
 * Generate a bcrypt hash for ADMIN_PASSWORD_HASH.
 *
 * Usage:
 *   node scripts/hash-admin-password.js "YourSecureAdminPassword"
 *
 * Or set ADMIN_PASSWORD env var:
 *   ADMIN_PASSWORD="YourSecureAdminPassword" node scripts/hash-admin-password.js
 */
const bcrypt = require('bcrypt');

const password = process.argv[2] || process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Usage: node scripts/hash-admin-password.js "YourSecureAdminPassword"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log('\nAdd this to your backend .env / Hostinger environment:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
