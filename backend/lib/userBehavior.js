/**
 * userBehavior.js
 * ─────────────────────────────────────────────────────────────
 * Redis-powered, per-user behavioral intelligence module.
 *
 * Architecture:
 *   user:behavior:{id}         — Sorted set of "category|hall|diet" keys
 *                                scored by timestamp (most recent = highest)
 *   pref:diet:{diet}           — Set of userIds who prefer a diet type
 *   pref:location:{hall}       — Set of userIds who frequent a dining hall
 *
 * All keys auto-expire in 30 days (configurable). Zero DB writes.
 * ─────────────────────────────────────────────────────────────
 */

const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

const BEHAVIOR_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_HISTORY  = 100;  // top-100 events per user

/**
 * recordInteraction
 * Called every time a student successfully reserves or picks up food.
 * Writes a composite behavior key into the user's sorted set.
 *
 * @param {number} userId
 * @param {object} food  — Food model instance or plain JSON
 * @param {string} diet  — user's dietary_preference at time of interaction
 */
async function recordInteraction(userId, food, diet = "Any") {
  if (!userId || !food) return;

  const now = Date.now();
  const hall  = (food.dining_hall || food.location || "unknown").toLowerCase();
  const score = now;

  // Fire-and-forget multiple writes in parallel — don't block request
  const writes = [];

  // 1. Write behavior event (sorted set, score = timestamp)
  const behaviorKey = `user:behavior:${userId}`;
  writes.push(
    redis.zadd(behaviorKey, { score, member: `hall:${hall}` }).catch(() => {}),
    redis.expire(behaviorKey, BEHAVIOR_TTL).catch(() => {})
  );

  // 2. Keep only latest MAX_HISTORY events (trim oldest)
  writes.push(
    redis.zremrangebyrank(behaviorKey, 0, -(MAX_HISTORY + 1)).catch(() => {})
  );

  // 3. Add user to preference indexes (sets — for O(1) notification lookup)
  if (diet && diet !== "Any") {
    const dietKey = `pref:diet:${diet.toLowerCase()}`;
    writes.push(
      redis.sadd(dietKey, String(userId)).catch(() => {}),
      redis.expire(dietKey, BEHAVIOR_TTL).catch(() => {})
    );
  }

  const locationKey = `pref:location:${hall}`;
  writes.push(
    redis.sadd(locationKey, String(userId)).catch(() => {}),
    redis.expire(locationKey, BEHAVIOR_TTL).catch(() => {})
  );

  await Promise.allSettled(writes);
}

/**
 * getUserProfile
 * Builds a behavioral profile for a user from their Redis sorted set.
 * Returns top N dining halls + interaction count.
 *
 * @param {number} userId
 * @returns {{ topHalls: string[], totalInteractions: number }}
 */
async function getUserProfile(userId) {
  if (!userId) return { topHalls: [], totalInteractions: 0 };

  try {
    const behaviorKey = `user:behavior:${userId}`;

    // Fetch top 50 most-recent events (highest scores = most recent)
    const members = await redis.zrange(behaviorKey, 0, 49, { rev: true });

    if (!members || members.length === 0) {
      return { topHalls: [], totalInteractions: 0 };
    }

    // Tally halls
    const hallCounts = {};
    for (const m of members) {
      if (m.startsWith("hall:")) {
        const hall = m.replace("hall:", "");
        hallCounts[hall] = (hallCounts[hall] || 0) + 1;
      }
    }

    const topHalls = Object.entries(hallCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hall]) => hall);

    return { topHalls, totalInteractions: members.length };
  } catch {
    return { topHalls: [], totalInteractions: 0 };
  }
}

/**
 * getInterestedUsers
 * Returns userIds interested in a newly posted food item.
 * Used by the smart notification engine.
 *
 * Matching logic:
 *   - Diet match: user in pref:diet:{food.diet} 
 *   - Location match: user in pref:location:{food.hall}
 *   - Union of both sets (OR match), deduplicated
 *
 * @param {object} food  — Food model instance or plain JSON
 * @param {string} diet  — inferred diet category of food ("Veg"/"Non-Veg"/"Any")
 * @returns {string[]} array of userId strings
 */
async function getInterestedUsers(food, diet = "Any") {
  try {
    const hall = (food.dining_hall || food.location || "").toLowerCase();
    const sets = [];

    if (diet && diet !== "Any") {
      sets.push(`pref:diet:${diet.toLowerCase()}`);
    }
    if (hall) {
      sets.push(`pref:location:${hall}`);
    }

    if (sets.length === 0) return [];

    // Union all matching pref sets into a temp key, then read it
    const tempKey = `notif:temp:${Date.now()}`;
    await redis.sunionstore(tempKey, ...sets);
    const userIds = await redis.smembers(tempKey);
    await redis.del(tempKey); // cleanup immediately

    return userIds || [];
  } catch {
    return [];
  }
}

/**
 * getUserImpact
 * Returns CO2 + meals saved stats for a specific user from Redis cache.
 * The authoritative numbers come from the DB; this is just a fast cache layer.
 */
async function cacheUserImpact(userId, impact) {
  await redis.set(`impact:${userId}`, impact, { ex: 300 }).catch(() => {});
}

async function getCachedUserImpact(userId) {
  return await redis.get(`impact:${userId}`).catch(() => null);
}

module.exports = {
  recordInteraction,
  getUserProfile,
  getInterestedUsers,
  cacheUserImpact,
  getCachedUserImpact,
};
