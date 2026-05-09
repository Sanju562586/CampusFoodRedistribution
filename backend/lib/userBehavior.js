/**
 * userBehavior.js
 * ─────────────────────────────────────────────────────────────
 * Redis-powered, per-user behavioral intelligence module.
 *
 * Architecture:
 *   user:behavior:{id}         — Sorted set of signal keys scored by weight×timestamp
 *   user:prefs:{id}            — Hash of {diet, allergens, topHalls, topKeywords}
 *   pref:diet:{diet}           — Set of userIds who prefer a diet type
 *   pref:location:{hall}       — Set of userIds who frequent a dining hall
 *   pref:keyword:{word}        — Set of userIds who interact with a food keyword
 *
 * Signal weights (higher = stronger learning signal):
 *   picked_up   = 5  (confirmed pickup — strongest signal)
 *   reserved    = 3  (reservation intent)
 *   viewed      = 1  (browsing signal — weakest)
 *
 * All keys auto-expire in 30 days. Zero DB writes.
 * ─────────────────────────────────────────────────────────────
 */

const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

const BEHAVIOR_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_HISTORY  = 200; // top-200 events per user

const SIGNAL_WEIGHTS = {
  picked_up: 5,
  reserved:  3,
  viewed:    1,
};

/**
 * recordInteraction
 * Called when a student views, reserves, or picks up food.
 *
 * @param {number} userId
 * @param {object} food       — Food model instance or plain JSON
 * @param {string} diet       — user's dietary_preference at time of interaction
 * @param {string} eventType  — "viewed" | "reserved" | "picked_up"
 */
async function recordInteraction(userId, food, diet = "Any", eventType = "reserved") {
  if (!userId || !food) return;

  const now    = Date.now();
  const weight = SIGNAL_WEIGHTS[eventType] || 1;
  const hall   = (food.dining_hall || food.location || "unknown").toLowerCase();
  const score  = now * weight; // Weight-amplified timestamp score

  const writes = [];
  const behaviorKey = `user:behavior:${userId}`;

  // ── 1. Hall signal ───────────────────────────────────────────
  writes.push(
    redis.zadd(behaviorKey, { score, member: `hall:${hall}` }).catch(() => {}),
    redis.sadd(`pref:location:${hall}`, String(userId)).catch(() => {}),
    redis.expire(`pref:location:${hall}`, BEHAVIOR_TTL).catch(() => {})
  );

  // ── 2. Diet preference signal ────────────────────────────────
  const effectiveDiet = diet && diet !== "Any" ? diet.toLowerCase() : null;
  if (effectiveDiet) {
    writes.push(
      redis.zadd(behaviorKey, { score, member: `diet:${effectiveDiet}` }).catch(() => {}),
      redis.sadd(`pref:diet:${effectiveDiet}`, String(userId)).catch(() => {}),
      redis.expire(`pref:diet:${effectiveDiet}`, BEHAVIOR_TTL).catch(() => {})
    );
  }

  // ── 3. Food keyword signals (from food name) ─────────────────
  const keywords = _extractKeywords(food.name || "");
  for (const kw of keywords) {
    writes.push(
      redis.zadd(behaviorKey, { score: score * 0.8, member: `kw:${kw}` }).catch(() => {}),
      redis.sadd(`pref:keyword:${kw}`, String(userId)).catch(() => {}),
      redis.expire(`pref:keyword:${kw}`, BEHAVIOR_TTL).catch(() => {})
    );
  }

  // ── 4. Price range signal ────────────────────────────────────
  const priceRange = _getPriceRange(food.price || 0);
  writes.push(
    redis.zadd(behaviorKey, { score: score * 0.5, member: `price:${priceRange}` }).catch(() => {})
  );

  // ── 5. Trim oldest entries ───────────────────────────────────
  writes.push(
    redis.zremrangebyrank(behaviorKey, 0, -(MAX_HISTORY + 1)).catch(() => {}),
    redis.expire(behaviorKey, BEHAVIOR_TTL).catch(() => {})
  );

  // ── 6. Update user preferences hash (fast lookup for matching) ─
  await _updateUserPrefsHash(userId, hall, keywords, effectiveDiet);

  await Promise.allSettled(writes);
}

/**
 * getUserProfile
 * Builds a rich behavioral profile for the AI recommendation engine.
 *
 * @param {number} userId
 * @returns {{ topHalls, topKeywords, topPriceRange, preferredDiet, totalInteractions }}
 */
async function getUserProfile(userId) {
  if (!userId) return _emptyProfile();

  try {
    const behaviorKey = `user:behavior:${userId}`;
    const members = await redis.zrange(behaviorKey, 0, 99, { rev: true });

    if (!members || members.length === 0) return _emptyProfile();

    const hallCounts    = {};
    const kwCounts      = {};
    const priceCounts   = {};
    const dietCounts    = {};

    for (const m of members) {
      if (m.startsWith("hall:"))  { const v = m.slice(5);  hallCounts[v]  = (hallCounts[v]  || 0) + 1; }
      if (m.startsWith("kw:"))    { const v = m.slice(3);  kwCounts[v]    = (kwCounts[v]    || 0) + 1; }
      if (m.startsWith("price:")) { const v = m.slice(6);  priceCounts[v] = (priceCounts[v] || 0) + 1; }
      if (m.startsWith("diet:"))  { const v = m.slice(5);  dietCounts[v]  = (dietCounts[v]  || 0) + 1; }
    }

    const topHalls      = _topN(hallCounts,  5);
    const topKeywords   = _topN(kwCounts,    10);
    const topPriceRange = _topN(priceCounts, 1)[0] || "any";
    const preferredDiet = _topN(dietCounts,  1)[0] || null;

    return { topHalls, topKeywords, topPriceRange, preferredDiet, totalInteractions: members.length };
  } catch {
    return _emptyProfile();
  }
}

/**
 * computeMatchScore
 * Scores a food item against a user's behavioral profile.
 * Returns a score 0-100 representing how closely the food matches.
 *
 * Used by: smart notification engine to decide if email is warranted.
 * Threshold: score >= 40 → send email notification.
 *
 * @param {object} food       — food item JSON
 * @param {object} profile    — result of getUserProfile()
 * @param {object} userPrefs  — { dietary_preferences, allergens[] }
 * @returns {number} 0–100
 */
function computeMatchScore(food, profile, userPrefs = {}) {
  let score = 0;

  const hall     = (food.dining_hall || food.location || "").toLowerCase();
  const foodName = (food.name || "").toLowerCase();
  const foodKws  = _extractKeywords(food.name || "");

  // ── Hall familiarity (0-30 pts) ──────────────────────────────
  if (profile.topHalls.includes(hall)) {
    const idx = profile.topHalls.indexOf(hall);
    score += Math.max(10, 30 - idx * 5); // rank-weighted
  }

  // ── Keyword overlap (0-25 pts) ───────────────────────────────
  const kwOverlap = foodKws.filter(kw => profile.topKeywords.includes(kw)).length;
  score += Math.min(25, kwOverlap * 8);

  // ── Diet match (0-20 pts) ────────────────────────────────────
  const userDiet = (userPrefs.dietary_preferences || "").toLowerCase();
  const profDiet = (profile.preferredDiet || "").toLowerCase();
  const allergens = (() => {
    try { return Array.isArray(userPrefs.allergens) ? userPrefs.allergens : JSON.parse(userPrefs.allergens || "[]"); }
    catch { return []; }
  })();
  const foodAllergens = (() => {
    try { return Array.isArray(food.allergens) ? food.allergens : JSON.parse(food.allergens || "[]"); }
    catch { return []; }
  })();

  // Hard block: allergen conflict → score = 0
  if (allergens.length > 0 && foodAllergens.some(a => allergens.map(x=>x.toLowerCase()).includes(a.toLowerCase()))) {
    return 0;
  }

  if (userDiet === "veg" && !foodAllergens.some(a => ["meat","chicken","fish","pork","beef"].includes(a.toLowerCase()))) score += 20;
  else if (userDiet === "non-veg") score += 15;
  else if (userDiet === "vegan" && foodAllergens.length === 0) score += 20;
  else score += 10;

  // ── Price range match (0-10 pts) ─────────────────────────────
  const foodPriceRange = _getPriceRange(food.price || 0);
  if (foodPriceRange === profile.topPriceRange) score += 10;

  // ── Urgency bonus (0-15 pts) — expiring soon is always relevant ─
  const hoursLeft = (new Date(food.expiry_time).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < 2)       score += 15;
  else if (hoursLeft < 4)  score += 10;
  else if (hoursLeft < 8)  score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * getInterestedUsers
 * Returns userIds interested in a newly posted food item.
 * Now uses UNION of diet + location + keyword preference sets.
 */
async function getInterestedUsers(food, diet = "Any") {
  try {
    const hall     = (food.dining_hall || food.location || "").toLowerCase();
    const keywords = _extractKeywords(food.name || "");
    const sets     = [];

    if (diet && diet !== "Any") sets.push(`pref:diet:${diet.toLowerCase()}`);
    if (hall)                   sets.push(`pref:location:${hall}`);
    for (const kw of keywords.slice(0, 3)) sets.push(`pref:keyword:${kw}`);

    if (sets.length === 0) return [];

    const tempKey = `notif:temp:${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await redis.sunionstore(tempKey, ...sets);
    const userIds = await redis.smembers(tempKey);
    await redis.del(tempKey);

    return userIds || [];
  } catch {
    return [];
  }
}

// ── Impact cache ─────────────────────────────────────────────────────────────
async function cacheUserImpact(userId, impact) {
  await redis.set(`impact:${userId}`, impact, { ex: 300 }).catch(() => {});
}

async function getCachedUserImpact(userId) {
  return await redis.get(`impact:${userId}`).catch(() => null);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _extractKeywords(name) {
  const stopWords = new Set(["with","and","or","the","a","an","of","in","at","to","for","large","small","medium","plate","bowl","combo","set","mix","special","fresh"]);
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);
}

function _getPriceRange(price) {
  if (price <= 0)   return "free";
  if (price <= 50)  return "budget";
  if (price <= 120) return "mid";
  if (price <= 250) return "premium";
  return "luxury";
}

function _topN(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function _emptyProfile() {
  return { topHalls: [], topKeywords: [], topPriceRange: "any", preferredDiet: null, totalInteractions: 0 };
}

async function _updateUserPrefsHash(userId, hall, keywords, diet) {
  try {
    const key = `user:prefs:${userId}`;
    const updates = {};
    if (hall)    updates[`hall_${hall}`]  = Date.now();
    if (diet)    updates[`diet_${diet}`]  = Date.now();
    for (const kw of keywords) updates[`kw_${kw}`] = Date.now();
    if (Object.keys(updates).length > 0) {
      await redis.hset(key, updates);
      await redis.expire(key, BEHAVIOR_TTL);
    }
  } catch { /* non-critical */ }
}

module.exports = {
  recordInteraction,
  getUserProfile,
  getInterestedUsers,
  computeMatchScore,
  cacheUserImpact,
  getCachedUserImpact,
};
