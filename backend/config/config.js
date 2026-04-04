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
            }
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
            acquire: 30000,
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
            }
        },
        // Same serverless-safe settings as development
        pool: {
            max: 3,
            min: 0,
            acquire: 30000,
            idle: 1000,
            evict: 1000,
        }
    }
};
