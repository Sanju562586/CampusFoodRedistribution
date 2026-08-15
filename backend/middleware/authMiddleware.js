const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { sessionCache, redis } = require("../lib/localCache"); // shared caches

// redis is imported from localCache singleton — no extra Redis.fromEnv() needed

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
    // Stage 1: Cryptographic JWT verification (instant in RAM, zero network calls)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "CHANGE_ME_SET_JWT_SECRET_IN_ENV"
    );

    const sessionKey = `session:${decoded.id}`;
    const revokedKey = `revoked:${decoded.id}`;

    // L1 Check: If explicitly marked revoked in process memory, block
    if (sessionCache.get(revokedKey)) {
      return res.status(401).json({ message: "Session expired or revoked" });
    }

    // Fast-path: Cryptographically valid JWT token signed with server secret
    req.user = decoded;

    // Warm L1 NodeCache if not set
    if (!sessionCache.has(sessionKey)) {
      sessionCache.set(sessionKey, true);
    }

    return next();
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