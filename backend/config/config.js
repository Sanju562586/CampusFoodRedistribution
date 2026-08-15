require('dotenv').config();
const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (error) {
    // Node < 17 doesn't support this
}

module.exports = {
    development: {
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
                servername: process.env.DB_HOSTNAME || process.env.DB_HOST
            },
            // Force IPv4 — Neon's pooler hostname resolves to both A (IPv4) and AAAA
            // (IPv6) records. Node.js tries IPv6 first; if the local machine has no
            // IPv6 route to the internet it throws ENETUNREACH. family:4 pins to IPv4.
            family: 4,
            // Fail fast on connection problems instead of hanging for 30s+
            connectionTimeoutMillis: 10000,
            statement_timeout:       30000,
        },
        // ─────────────────────────────────────────────────────────────
        // SERVERLESS-SAFE POOL SETTINGS
        // pool.max = 3  →  Each Vercel function instance opens at most
        //                   3 connections. Neon free tier uses pgBouncer
        //                   (limit ~25 total). Multiple concurrect cold-
        //                   starts with max=10 would exhaust that limit.
        // pool.idle = 1000 → Release idle connections in 1s so Neon can
        //                   auto-suspend the compute between requests.
        // pool.evict = 1000 → Evict stale sockets aggressively.
        // ─────────────────────────────────────────────────────────────
        pool: {
            max: 3,
            min: 0,
            acquire: 15000, // fail fast — don't wait more than 15s for a connection slot
            idle: 1000,
            evict: 1000,
        }
    },
    test: {
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 2,
            min: 0,
            acquire: 30000,
            idle: 1000,
        }
    },
    production: {
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
                servername: process.env.DB_HOSTNAME || process.env.DB_HOST // SNI required for Neon
            },
            // Force IPv4 — same reasoning as development above
            family: 4,
            connectionTimeoutMillis: 10000,
            statement_timeout:       30000,
        },
        // Same serverless-safe settings as development
        pool: {
            max: 3,
            min: 0,
            acquire: 15000,
            idle: 1000,
            evict: 1000,
        }
    }
};
