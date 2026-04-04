/**
 * localCache.js — Shared in-process L1 cache (node-cache)
 *
 * Purpose: Eliminate all network round-trips for hot data.
 * NodeCache lives in the worker process RAM — zero HTTP, zero latency.
 *
 * Key TTLs:
 *   sessions  → 15 min  (warm enough to avoid Redis on 99.9% of requests)
 *   food      → 10 s    (matches Redis L2 TTL; keeps data fresh)
 *   stats     → 10 s
 */
const NodeCache = require("node-cache");

// Session cache — keyed by `session:<userId>`
// checkperiod: evict stale keys every 60 s in background
const sessionCache = new NodeCache({ stdTTL: 900, checkperiod: 60, useClones: false });

// Food data cache — keyed by "availableFood" | "stats"
const foodCache = new NodeCache({ stdTTL: 10, checkperiod: 12, useClones: false });

module.exports = { sessionCache, foodCache };
