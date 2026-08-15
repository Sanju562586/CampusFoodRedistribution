/**
 * localCache.js — Shared in-process L1 cache (node-cache) + Redis singleton
 *
 * Purpose: Eliminate all network round-trips for hot data.
 * NodeCache lives in the worker process RAM — zero HTTP, zero latency.
 *
 * Key TTLs:
 *   sessions  → 15 min  (warm enough to avoid Redis on 99.9% of requests)
 *   food      → 10 s    (matches Redis L2 TTL; keeps data fresh)
 *   stats     → 10 s
 *   users     →  5 min  (user profile data — invalidated on update/delete)
 *   qr        → 60 min  (QR codes are deterministic; same code = same image)
 *   aiRecs    → 60 s    (per-user AI recommendations)
 *   adminFood →  5 s    (admin /food/all — fast invalidation on mutations)
 */
const NodeCache = require("node-cache");
const { Redis } = require("@upstash/redis");

// ─── Session cache — keyed by `session:<userId>` ─────────────────────────────
// checkperiod: evict stale keys every 60 s in background
const sessionCache = new NodeCache({ stdTTL: 900,  checkperiod: 60,  useClones: false });

// ─── Food data cache — keyed by "availableFood" | "stats" ────────────────────
const foodCache    = new NodeCache({ stdTTL: 10,   checkperiod: 12,  useClones: false });

// ─── User profile cache — keyed by `user:<userId>` ───────────────────────────
// Eliminates the DB hit on every GET /auth/user/me call.
// Invalidated immediately on profile update and user delete.
const userCache    = new NodeCache({ stdTTL: 300,  checkperiod: 60,  useClones: false });

// ─── QR Code cache — keyed by `qr:<reservation_code>` ───────────────────────
// QR codes are deterministic: same code always produces the same PNG dataURL.
// No need to ever regenerate — cache for the entire session.
const qrCache      = new NodeCache({ stdTTL: 3600, checkperiod: 120, useClones: false });

// ─── AI Recommendations cache — keyed by `airec:<userId>` ───────────────────
// Caches Gemini + DB result per user for 60 s. Invalidated on new food post.
const aiCache      = new NodeCache({ stdTTL: 60,   checkperiod: 30,  useClones: false });

// ─── Admin food list cache — keyed by "adminFood" ────────────────────────────
// 5s TTL — short enough to feel real-time, long enough to collapse bursts.
const adminFoodCache = new NodeCache({ stdTTL: 5, checkperiod: 6, useClones: false });

// ─── Shared Redis singleton ───────────────────────────────────────────────────
// ONE instance shared across all route files. Avoids repeated env parsing and
// connection overhead from multiple Redis.fromEnv() calls at module load time.
const redis = Redis.fromEnv();

module.exports = { sessionCache, foodCache, userCache, qrCache, aiCache, adminFoodCache, redis };
