const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { Redis } = require("@upstash/redis");
const { sessionCache } = require("../lib/localCache");

// Shared Redis client — REST-based, safe in serverless
const redis = Redis.fromEnv();

/**
 * authenticate
 *
 * 3-tier session resolution — fastest first:
 *
 * L1: In-process NodeCache (nanoseconds — pure RAM)
 *     → Eliminates 99%+ of Redis calls under load
 * L2: Upstash Redis (20-100ms — cloud REST call)
 *     → Cross-worker cache; warm new workers without hitting DB
 * L3: Neon PostgreSQL DB (cold path only, <0.01% of requests)
 *     → Populates L2 + L1 for future requests
 *
 * JWT cryptographic verification happens before any cache check
 * so invalid tokens are rejected with zero downstream calls.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    // Stage 1: Cryptographic JWT verification — no network call, no DB hit
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "CHANGE_ME_SET_JWT_SECRET_IN_ENV"
    );

    const sessionKey = `session:${decoded.id}`;

    // ─── L1: In-process NodeCache (zero network) ──────────────────────
    if (sessionCache.has(sessionKey)) {
      req.user = decoded;
      return next();
    }

    // ─── L2: Upstash Redis (cross-worker shared cache) ────────────────
    const cachedSession = await redis.get(sessionKey);

    if (cachedSession) {
      // Warm L1 for subsequent requests in this worker
      sessionCache.set(sessionKey, true);
      req.user = decoded;
      return next();
    }

    // ─── L3: DB cold path — verify user still exists ─────────────────
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "role"],
    });

    if (!user) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    // Populate both caches to keep this user off the cold path
    await redis.set(
      sessionKey,
      JSON.stringify({ id: user.id, role: user.role }),
      { ex: 3600 }
    );
    sessionCache.set(sessionKey, true);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * authorize
 * Role-based access control middleware.
 * Accepts a single role string or an array of allowed roles.
 */
function authorize(roles) {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };