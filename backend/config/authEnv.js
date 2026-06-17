function decodeBase64Hash(value) {
  if (!value) return null;
  try {
    return Buffer.from(String(value).trim(), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function getAdminPasswordHash() {
  const direct = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (direct) {
    return direct;
  }

  const decoded = decodeBase64Hash(process.env.ADMIN_PASSWORD_HASH_B64);
  if (decoded?.startsWith('$2')) {
    return decoded;
  }

  return null;
}

function getAuthEnvCheck() {
  const adminUsername = process.env.ADMIN_USERNAME?.trim() || null;
  const directHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  const base64Hash = process.env.ADMIN_PASSWORD_HASH_B64?.trim() || null;
  const resolvedHash = getAdminPasswordHash();

  return {
    hasAdminUsername: Boolean(adminUsername),
    adminUsername,
    hasAdminPasswordHash: Boolean(directHash),
    adminPasswordHashLength: directHash?.length || 0,
    adminPasswordHashLooksValid: Boolean(directHash?.startsWith('$2') && directHash.length >= 59),
    hasAdminPasswordHashB64: Boolean(base64Hash),
    resolvedAdminPasswordHashLength: resolvedHash?.length || 0,
    resolvedAdminPasswordHashLooksValid: Boolean(
      resolvedHash?.startsWith('$2') && resolvedHash.length >= 59
    ),
    hasJwtSecret: Boolean(process.env.JWT_SECRET?.trim()),
  };
}

module.exports = {
  getAdminPasswordHash,
  getAuthEnvCheck,
};
