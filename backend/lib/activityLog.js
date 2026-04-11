/**
 * activityLog.js — In-memory circular activity log
 * 
 * Captures key platform events (login, register, food create, reservation, pickup, delete)
 * and keeps the last MAX_ENTRIES in memory. Exposed via GET /api/auth/admin/logs.
 * 
 * Design: Ring-buffer approach — no DB writes, no filesystem I/O.
 * Each entry is ~300 bytes; 500 entries ≈ 150 KB max RAM usage.
 */

const MAX_ENTRIES = 500;

/** @type {ActivityEntry[]} */
const log = [];
let _seq = 0;

/**
 * @typedef {Object} ActivityEntry
 * @property {number} seq
 * @property {string} id
 * @property {string} type  - "login" | "register" | "food_create" | "food_delete" | "reservation" | "pickup" | "verify_fail" | "logout" | "error"
 * @property {string} level - "info" | "success" | "warning" | "error"
 * @property {string} message
 * @property {string} [actor]   - user email or name
 * @property {string} [role]    - user role
 * @property {string} [detail]  - short supplementary info
 * @property {string} timestamp - ISO8601
 */

/**
 * Push a new activity entry into the ring buffer.
 * @param {{ type: string, level?: string, message: string, actor?: string, role?: string, detail?: string }} entry
 */
function push(entry) {
  if (log.length >= MAX_ENTRIES) log.shift(); // evict oldest
  log.push({
    seq: ++_seq,
    id: `log_${_seq}`,
    type: entry.type,
    level: entry.level || "info",
    message: entry.message,
    actor: entry.actor || null,
    role: entry.role || null,
    detail: entry.detail || null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Return recent entries (newest first), optionally filtered.
 * @param {{ limit?: number, type?: string }} opts
 * @returns {ActivityEntry[]}
 */
function recent({ limit = 100, type } = {}) {
  let entries = [...log].reverse();
  if (type) entries = entries.filter((e) => e.type === type);
  return entries.slice(0, limit);
}

module.exports = { push, recent };
