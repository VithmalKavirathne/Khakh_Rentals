const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env only. override:false keeps Hostinger/platform env vars (e.g. DATABASE_URL) intact.
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath, override: false });

function getDatabaseEnvCheck() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        return {
            hasDatabaseUrl: false,
            host: process.env.DB_HOST || null,
            port: process.env.DB_PORT ? String(process.env.DB_PORT) : null,
            database: process.env.DB_NAME || null,
            username: process.env.DB_USER || null,
            isSupabaseHost: false,
        };
    }

    try {
        const parsed = new URL(url);
        const username = parsed.username
            ? decodeURIComponent(parsed.username)
            : null;

        return {
            hasDatabaseUrl: true,
            host: parsed.hostname || null,
            port: parsed.port || '5432',
            database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : null,
            username,
            isSupabaseHost: parsed.hostname.includes('supabase.co'),
        };
    } catch {
        return {
            hasDatabaseUrl: true,
            host: null,
            port: null,
            database: null,
            username: null,
            isSupabaseHost: false,
        };
    }
}

module.exports = { getDatabaseEnvCheck };
