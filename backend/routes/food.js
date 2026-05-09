const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food, User } = require("../models");
const { Op } = require("sequelize");
const { Redis } = require("@upstash/redis");
const { foodCache } = require("../lib/localCache");
const cloudinary = require("../config/cloudinary");

// Shared Redis client — REST-based, serverless-safe
const redis = Redis.fromEnv();

const router = express.Router();
const { Client, Receiver } = require("@upstash/qstash");
const activityLog = require("../lib/activityLog");
const userBehavior = require("../lib/userBehavior");

// ─────────────────────────────────────────────
// Email helper — Brevo HTTP API (same pattern as auth.js)
// ─────────────────────────────────────────────
async function sendEmailNotification(to, name, food, matchScore = 0) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[DEV EMAIL] Smart notif (score:${matchScore}) → ${to} for food: ${food.name}`);
    return false;
  }
  const expiryStr = new Date(food.expiry_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const scoreLabel = matchScore >= 70 ? "🔥 Perfect Match" : matchScore >= 40 ? "✅ Great Match" : "📍 New Nearby";
  const scoreBgColor = matchScore >= 70 ? "#d32f2f" : matchScore >= 40 ? "#388e3c" : "#1565c0";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px;background:#f9f9f9;">
      <h2 style="color:#388e3c;text-align:center;">🍱 Food Match for ${name}!</h2>
      <div style="text-align:center;margin-bottom:12px;">
        <span style="background:${scoreBgColor};color:#fff;font-size:12px;font-weight:bold;padding:4px 12px;border-radius:12px;">${scoreLabel} · ${matchScore}% match</span>
      </div>
      <p style="color:#555;text-align:center;">A food item matching your preferences is now available:</p>
      <div style="background:#fff;padding:20px;border-radius:8px;margin:16px 0;box-shadow:0 2px 4px rgba(0,0,0,0.08);">
        <h3 style="margin:0 0 8px;color:#222;">${food.name}</h3>
        <p style="margin:4px 0;color:#555;"><strong>📍 Location:</strong> ${food.dining_hall || food.location}</p>
        ${food.landmark ? `<p style="margin:4px 0;color:#555;"><strong>🏢 Landmark:</strong> ${food.landmark}</p>` : ""}
        <p style="margin:4px 0;color:#555;"><strong>📦 Available:</strong> ${food.quantity} servings</p>
        <p style="margin:4px 0;color:#555;"><strong>💰 Price:</strong> ₹${food.price || 0}</p>
        <p style="margin:4px 0;color:#e53935;"><strong>⏰ Expires at:</strong> ${expiryStr}</p>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="background:#388e3c;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Reserve Now →</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;margin-top:24px;">You're receiving this because your preferences match this item · <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="color:#aaa;">Manage preferences</a></p>
    </div>`;
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "accept": "application/json", "content-type": "application/json", "api-key": process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: "CampusFood Alerts", email: process.env.EMAIL_USER || "noreplyfr213@gmail.com" },
        to: [{ email: to, name }],
        subject: `${scoreLabel}: ${food.name} near ${food.dining_hall || food.location}`,
        htmlContent: html,
      }),
    });
    if (!resp.ok) {
      const d = await resp.json().catch(() => ({}));
      throw new Error(JSON.stringify(d));
    }
    console.log(`[SMART NOTIF EMAIL] Sent to ${to} for "${food.name}"`);
    return true;
  } catch (e) {
    console.error("[SMART NOTIF EMAIL ERROR]", e.message);
    return false;
  }
}

// ─────────────────────────────────────────────
// In-flight promise coalescing for /available
// Prevents thundering herd when L1 cache expires:
// all concurrent requests share ONE DB promise.
// ─────────────────────────────────────────────
let _availableInflight = null;

// ─────────────────────────────────────────────
// GET /api/food/stats
// Admin only — active food count with Redis cache
// ─────────────────────────────────────────────
router.get("/stats", authenticate, authorize("admin"), async (req, res) => {
  try {
    // L1: In-process cache (instant)
    const l1Stats = foodCache.get("stats");
    if (l1Stats !== undefined) {
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
      return res.json(l1Stats);
    }

    // L2: Upstash Redis
    const cachedStats = await redis.get("stats");
    if (cachedStats) {
      foodCache.set("stats", cachedStats);
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
      return res.json(cachedStats);
    }

    const now = new Date();
    const activeCount = await Food.count({
      where: {
        expiry_time: { [Op.gt]: now },
        quantity: { [Op.gt]: 0 },
      },
    });

    const statsData = { activeCount };
    foodCache.set("stats", statsData);
    await redis.set("stats", statsData, { ex: 10 });
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    res.json(statsData);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// ─────────────────────────────────────────────
// POST /api/food/create
// Donor only — queues creation via QStash
// Returns 202 instantly; DB write happens async
// ─────────────────────────────────────────────
router.post(
  "/create",
  authenticate,
  authorize(["donor"]),
  async (req, res) => {
    const {
      name, quantity, expiry_time, dining_hall,
      allergens, location, landmark, image_url, price,
      latitude, longitude,
    } = req.body;

    if (!name)
      return res.status(400).json({ message: "Missing field: Food Name" });
    if (quantity === undefined || quantity === null)
      return res.status(400).json({ message: "Missing field: Quantity" });
    if (!expiry_time)
      return res.status(400).json({ message: "Missing field: Expiry Time" });
    if (!dining_hall && !location)
      return res.status(400).json({ message: "Missing field: Location/Dining Hall" });

    try {
      let finalImageUrl = image_url || null;
      if (image_url && image_url.startsWith('data:image')) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(image_url, {
            folder: 'campus_food'
          });
          finalImageUrl = uploadResponse.secure_url;
          activityLog.push({ type: "food_create", level: "info", message: "Food image uploaded to Cloudinary", actor: `Donor #${req.user.id}`, role: "donor", detail: finalImageUrl });
        } catch (cloudinaryErr) {
          console.error("Cloudinary Upload Error:", cloudinaryErr);
          activityLog.push({ type: "food_create", level: "error", message: "Cloudinary image upload failed", actor: `Donor #${req.user.id}`, role: "donor", detail: cloudinaryErr.message });
          return res.status(500).json({ message: "Image upload failed. Check Cloudinary configuration." });
        }
      }

      const payload = {
        name,
        quantity,
        expiry_time,
        dining_hall,
        allergens: allergens || [],
        donorId: req.user.role === "donor" ? req.user.id : null,
        location: location || dining_hall,
        landmark: landmark || null,
        image_url: finalImageUrl,
        price: price || 0,
        status: "available",
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
      };

      // ── QStash routing decision ──────────────────────────────────────────
      // QStash is only used when BOTH conditions are true:
      //   1. A real QSTASH_TOKEN is present (not the placeholder)
      //   2. APP_URL is set to a real publicly-reachable URL (not localhost or placeholder)
      // Any other combination falls back to a direct synchronous DB write.

      const appUrl = process.env.APP_URL || "";
      const isQStashReady =
        process.env.QSTASH_TOKEN &&
        process.env.QSTASH_TOKEN !== "add_your_token_here" &&
        appUrl &&
        !appUrl.includes("localhost") &&
        !appUrl.includes("127.0.0.1") &&
        !appUrl.includes("your-backend") &&   // catch un-edited placeholder
        appUrl.startsWith("https://");         // must be a real HTTPS endpoint

      if (!isQStashReady) {
        console.log("[food/create] Using direct DB write (QStash not fully configured).");
        return await directFoodCreate(payload, req.pusher, res);
      }

      try {
        const targetUrl = `${appUrl}/api/food/worker-create`;
        const qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
        await qstashClient.publishJSON({ url: targetUrl, body: payload });

        activityLog.push({ type: "food_create", level: "info", message: `Food creation queued via QStash: ${name}`, actor: `Donor #${req.user.id}`, role: "donor", detail: `${quantity} units @ ${dining_hall || location}` });

        // Return 202 instantly — user doesn't wait for DB
        res.status(202).json({ message: "Food creation queued successfully" });
      } catch (qstashErr) {
        console.error("QStash Publish Error:", qstashErr.message);
        // QStash failed — fall back to direct write so the donor's item is never lost
        console.warn("[food/create] QStash failed — falling back to direct DB write.");
        return await directFoodCreate(payload, req.pusher, res);
      }
    } catch (err) {
      console.error("Food Create Error:", err);
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
);

// ─────────────────────────────────────────────
// Helper: Direct DB write (QStash fallback / dev mode)
// ─────────────────────────────────────────────
async function directFoodCreate(payload, pusherClient, res) {
  try {
    const food = await Food.create({
      ...payload,
      allergens: JSON.stringify(payload.allergens),
    });

    const foodJson = food.toJSON();
    try {
      foodJson.allergens =
        typeof foodJson.allergens === "string"
          ? JSON.parse(foodJson.allergens)
          : foodJson.allergens;
    } catch (e) {
      foodJson.allergens = [];
    }

    if (pusherClient) pusherClient.trigger("food-channel", "food_added", foodJson);

    // 🔔 Smart Notifications — fire targeted Pusher events to interested students
    // We check the behavior preference index (O(1) Redis set lookups) to find
    // users who have previously picked up food from the same location or same diet.
    // Each matching user gets a private notification on their own channel.
    _sendSmartNotifications(pusherClient, foodJson).catch(() => {});

    activityLog.push({
      type: "food_create",
      level: "success",
      message: `New food posted: ${foodJson.name}`,
      actor: `Donor #${foodJson.donorId || "unknown"}`,
      role: "donor",
      detail: `${foodJson.quantity} units @ ${foodJson.dining_hall || foodJson.location}`,
    });

    // Invalidate BOTH cache layers atomically:
    // L1 (in-process NodeCache) must be cleared first so the NEXT request
    // in this worker hits DB — not the stale in-RAM snapshot.
    foodCache.del("availableFood");
    foodCache.del("stats");
    await redis.del("availableFood", "stats");

    if (res) return res.status(201).json(food);
  } catch (err) {
    console.error("directFoodCreate error:", err);
    if (res) return res.status(500).json({ message: "Failed to create food" });
  }
}

// ─────────────────────────────────────────────
// Smart Notification Engine
// Scores each student 0–100 against a newly posted food item.
// Pusher bell  → score ≥ 30 (diet/location match — broad reach)
// Email alert  → score ≥ 70 (very high match ONLY — behaviorally learned)
// ─────────────────────────────────────────────
async function _sendSmartNotifications(pusherClient, food) {
  const EMAIL_THRESHOLD  = 70;
  const PUSHER_THRESHOLD = 30;

  const allStudents = await User.findAll({
    where: { role: "student" },
    attributes: ["id", "email", "name", "dietary_preferences", "allergens"],
  }).catch(() => []);

  if (allStudents.length === 0) return;

  let pusherCount = 0;
  let emailCount  = 0;

  for (const u of allStudents) {
    const profile = await userBehavior.getUserProfile(u.id).catch(() => ({
      topHalls: [], topKeywords: [], topPriceRange: "any", preferredDiet: null, totalInteractions: 0,
    }));

    let score = userBehavior.computeMatchScore(food, profile, {
      dietary_preferences: u.dietary_preferences,
      allergens: u.allergens,
    });

    // New users with no behavior yet: use diet-based baseline so they still get notified
    if (profile.totalInteractions === 0 && score > 0) {
      score = Math.max(score, _baselineDietScore(food, u));
    }

    if (score === 0) continue; // allergen conflict \u2014 skip entirely

    const notifTitle = score >= 70 ? "\ud83d\udd25 Perfect Match!" : score >= 40 ? "\ud83c\udf71 Great Match!" : "\ud83c\udf71 New Food Available!";

    if (score >= PUSHER_THRESHOLD && pusherClient) {
      pusherClient.trigger(`user-${u.id}`, "food_notification", {
        id:         `notif_${Date.now()}_${u.id}`,
        type:       "food_match",
        title:      notifTitle,
        message:    `${food.name} is available at ${food.dining_hall || food.location}`,
        foodId:     food.id,
        foodName:   food.name,
        hall:       food.dining_hall || food.location,
        quantity:   food.quantity,
        expiresAt:  food.expiry_time,
        matchScore: score,
        timestamp:  new Date().toISOString(),
      }).catch(() => {});
      pusherCount++;
    }

    if (score >= EMAIL_THRESHOLD) {
      await sendEmailNotification(u.email, u.name || "Student", food, score);
      emailCount++;
    }
  }

  activityLog.push({
    type: "ai", level: "info",
    message: `Smart notifications sent for "${food.name}"`,
    actor: "AI Notification Engine", role: "system",
    detail: `Pusher: ${pusherCount} \u00b7 Emails (score\u2265${EMAIL_THRESHOLD}): ${emailCount} \u00b7 Hall: ${food.dining_hall || food.location}`,
  });
}

function _baselineDietScore(food, user) {
  const userDiet = (user.dietary_preferences || "").toLowerCase();
  const foodAllergens = (() => {
    try { return Array.isArray(food.allergens) ? food.allergens : JSON.parse(food.allergens || "[]"); }
    catch { return []; }
  })();
  const isNonVeg = foodAllergens.some(a => ["meat","chicken","fish","pork","beef"].includes(a.toLowerCase()));
  if (userDiet === "veg"    && !isNonVeg)  return 45;
  if (userDiet === "non-veg" && isNonVeg)  return 45;
  if (userDiet === "vegan"  && foodAllergens.length === 0) return 50;
  return 35;
}

// ─────────────────────────────────────────────
// POST /api/food/worker-create
// QStash Webhook Receiver (Internal)
// Called by QStash after food creation is queued
// ─────────────────────────────────────────────
router.post("/worker-create", async (req, res) => {
  console.log("📥 QStash Worker: processing food creation");

  // Verify QStash Signature for production deployments
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    try {
      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      });

      const isValid = await receiver.verify({
        signature: req.headers["upstash-signature"],
        body: req.rawBody,
      });

      if (!isValid) {
        return res.status(401).json({ message: "Invalid QStash signature" });
      }
    } catch (err) {
      console.error("QStash Signature Verification Error:", err);
      return res.status(401).json({ message: "QStash authorization failed" });
    }
  }

  try {
    const payload = req.body;

    const food = await Food.create({
      ...payload,
      allergens: JSON.stringify(payload.allergens || []),
    });

    const foodJson = food.toJSON();
    try {
      foodJson.allergens =
        typeof foodJson.allergens === "string"
          ? JSON.parse(foodJson.allergens)
          : foodJson.allergens;
    } catch (e) {
      foodJson.allergens = [];
    }

    // Trigger real-time update for connected clients
    if (req.pusher) req.pusher.trigger("food-channel", "food_added", foodJson);

    activityLog.push({ type: "food_create", level: "success", message: `QStash worker created food: ${foodJson.name}`, actor: `Donor #${foodJson.donorId || "unknown"}`, role: "donor", detail: `${foodJson.quantity} units @ ${foodJson.dining_hall || foodJson.location}` });

    // Invalidate BOTH cache layers so the next request hits the DB.
    foodCache.del("availableFood");
    foodCache.del("stats");
    await redis.del("availableFood", "stats");

    res.status(200).json({ message: "Worker successfully resolved operation." });
  } catch (err) {
    console.error("Worker Execution Error:", err);
    res.status(500).json({ message: "Worker operation failed" });
  }
});

// ─────────────────────────────────────────────
// GET /api/food/available
// Student + Admin — hottest read endpoint
//
// L1: Redis cache (30s TTL)
// L2: Distributed mutex lock prevents cache stampede:
//     only ONE request hits DB when cache expires,
//     all others poll Redis for 50ms intervals.
// ─────────────────────────────────────────────
router.get(
  "/available",
  authenticate,
  authorize(["student", "admin"]),
  async (req, res) => {
    try {
      // ─── L1: In-process NodeCache (pure RAM, ~0ms) ────────────────────
      // This is the hot path: served from worker process memory.
      // No network calls whatsoever — handles 99%+ of requests here.
      const l1Data = foodCache.get("availableFood");
      if (l1Data !== undefined) {
        res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
        return res.json(l1Data);
      }

      // ─── L1 MISS: Promise coalescing ─────────────────────────────────
      // If another coroutine in THIS worker is already fetching,
      // all concurrent requests await the SAME promise — no duplication.
      if (_availableInflight) {
        const data = await _availableInflight;
        res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
        return res.json(data);
      }

      // ─── Become the single fetcher for this worker ────────────────────
      _availableInflight = _fetchAndCacheAvailableFood();

      try {
        const data = await _availableInflight;
        res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
        res.json(data);
      } finally {
        _availableInflight = null;
      }
    } catch (err) {
      _availableInflight = null;
      console.error("GET /food/available error:", err);
      res.status(500).json({ message: "Failed to fetch food" });
    }
  }
);

/**
 * _fetchAndCacheAvailableFood
 * Single async fetch path:
 *   1. Try Upstash Redis (L2) — cross-worker cache
 *   2. Fall back to Neon DB (L3) — cold path only
 * Populates L1 (NodeCache) so the next request in this worker is instant.
 */
async function _fetchAndCacheAvailableFood() {
  // L2: Upstash Redis
  const redisData = await redis.get("availableFood");
  if (redisData) {
    foodCache.set("availableFood", redisData);
    return redisData;
  }

  // L3: Database
  const now = new Date();
  const availableFood = await Food.findAll({
    where: {
      expiry_time: { [Op.gt]: now },
      quantity: { [Op.gt]: 0 },
    },
    // Only fetch columns the frontend actually needs
    attributes: ["id", "name", "quantity", "expiry_time", "dining_hall",
                 "allergens", "location", "landmark", "image_url", "price",
                 "status", "donorId", "createdAt", "latitude", "longitude"],
  });

  const formattedFood = availableFood.map((f) => {
    const json = f.toJSON();
    let parsedAllergens = [];
    try {
      if (typeof json.allergens === "string")
        parsedAllergens = JSON.parse(json.allergens || "[]");
      else if (Array.isArray(json.allergens))
        parsedAllergens = json.allergens;
    } catch (_) {
      parsedAllergens = [];
    }
    return { ...json, allergens: parsedAllergens };
  });

  // Populate L1 and L2
  foodCache.set("availableFood", formattedFood);
  // Fire-and-forget Redis write — don't block the response
  redis.set("availableFood", formattedFood, { ex: 30 }).catch(() => {});

  return formattedFood;
}

// ─────────────────────────────────────────────
// GET /api/food/all
// Admin only — no cache (admin needs real-time data)
// ─────────────────────────────────────────────
router.get(
  "/all",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const allFood = await Food.findAll({
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: require("../models").User,
            as: "donor",
            attributes: ["name", "email"],
          },
          {
            model: require("../models").Reservation,
            include: [
              {
                model: require("../models").User,
                attributes: ["name", "email"],
              }
            ]
          }
        ],
      });

      const formattedFood = allFood.map((f) => {
        const json = f.toJSON();
        let parsedAllergens = [];
        try {
          if (typeof json.allergens === "string")
            parsedAllergens = JSON.parse(json.allergens || "[]");
          else if (Array.isArray(json.allergens))
            parsedAllergens = json.allergens;
        } catch (e) {
          parsedAllergens = [];
        }
        return { ...json, allergens: parsedAllergens };
      });

      res.json(formattedFood);
    } catch (err) {
      console.error("GET /food/all error:", err);
      res.status(500).json({ message: "Failed to fetch all food" });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/food/my-listings
// Donor only
// ─────────────────────────────────────────────
router.get(
  "/my-listings",
  authenticate,
  authorize(["donor"]),
  async (req, res) => {
    try {
      const foods = await Food.findAll({
        where: { donorId: req.user.id },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: require("../models").Reservation,
            required: false,
            include: [
              {
                model: require("../models").User,
                attributes: ["name", "college", "roll_number"],
              },
            ],
          },
        ],
      });
      res.json(foods);
    } catch (err) {
      console.error("GET /food/my-listings error:", err);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/food/:id
// Admin only
// ─────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const food = await Food.findByPk(id);
      const deleted = await Food.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ message: "Food item not found" });

      activityLog.push({
        type: "food_delete",
        level: "warning",
        message: `Food removed: ${food?.name || `ID #${id}`}`,
        actor: `Admin #${req.user.id}`,
        role: "admin",
        detail: `Food ID: ${id}`,
      });

      // Invalidate BOTH cache layers after deletion.
      foodCache.del("availableFood");
      foodCache.del("stats");
      await redis.del("availableFood", "stats");

      res.json({ message: "Food item deleted successfully" });
    } catch (err) {
      console.error("DELETE /food/:id error:", err);
      res.status(500).json({ message: "Failed to delete food item" });
    }
  }
);

module.exports = router;
