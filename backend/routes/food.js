const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food } = require("../models");
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
      };

      // Check if QStash is properly configured
      if (
        !process.env.QSTASH_TOKEN ||
        process.env.QSTASH_TOKEN === "add_your_token_here"
      ) {
        console.warn(
          "⚠️ QSTASH_TOKEN missing — executing direct DB write (not recommended for production)."
        );
        return await directFoodCreate(payload, req.pusher, res);
      }

      try {
        // Publish to QStash — decouples DB write from user response
        const targetUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/food/worker-create`;
        
        // QStash is a cloud service and cannot reach localhost.
        if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1")) {
          console.warn("⚠️ Localhost detected in target URL. QStash cannot reach local networks. Executing direct DB write.");
          return await directFoodCreate(payload, req.pusher, res);
        }

        const qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
        await qstashClient.publishJSON({ url: targetUrl, body: payload });

        activityLog.push({ type: "food_create", level: "info", message: `Food creation queued via QStash: ${name}`, actor: `Donor #${req.user.id}`, role: "donor", detail: `${quantity} units @ ${dining_hall || location}` });

        // Return 202 instantly — user doesn't wait for DB
        res.status(202).json({ message: "Food creation queued successfully" });
      } catch (qstashErr) {
        console.error("QStash Publish Error:", qstashErr);
        activityLog.push({ type: "food_create", level: "error", message: "QStash publish failed for food creation", actor: `Donor #${req.user.id}`, role: "donor", detail: qstashErr.message });
        res.status(500).json({ message: "Failed to queue food creation" });
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

    // ✅ Targeted invalidation only — DO NOT flushall()
    // flushall() would destroy session cache, leaderboard cache, etc.
    await redis.del("availableFood", "stats");

    if (res) return res.status(201).json(food);
  } catch (err) {
    console.error("directFoodCreate error:", err);
    if (res) return res.status(500).json({ message: "Failed to create food" });
  }
}

// ─────────────────────────────────────────────
// Smart Notification Engine
// Checks behavior preference indexes and fires
// targeted Pusher events to relevant students
// ─────────────────────────────────────────────
async function _sendSmartNotifications(pusherClient, food) {
  if (!pusherClient) return;

  // Infer diet from allergens (simple heuristic; extend as needed)
  const allergens = Array.isArray(food.allergens) ? food.allergens : [];
  const hasNonVegAllergens = allergens.some(a =>
    ["meat", "chicken", "fish", "egg", "pork", "beef"].includes(a.toLowerCase())
  );
  const diet = hasNonVegAllergens ? "Non-Veg" : "Any";

  const interestedUserIds = await userBehavior.getInterestedUsers(food, diet);

  if (!interestedUserIds || interestedUserIds.length === 0) return;

  const notification = {
    id:        `notif_${Date.now()}`,
    type:      "food_match",
    title:     "🍱 New Food Match!",
    message:   `${food.name} is now available at ${food.dining_hall || food.location}`,
    foodId:    food.id,
    foodName:  food.name,
    hall:      food.dining_hall || food.location,
    quantity:  food.quantity,
    expiresAt: food.expiry_time,
    timestamp: new Date().toISOString(),
  };

  // Batch Pusher triggers — max 10 per batch to avoid API limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < interestedUserIds.length; i += BATCH_SIZE) {
    const batch = interestedUserIds.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(uid =>
        pusherClient.trigger(`user-${uid}`, "food_notification", notification)
      )
    );
  }

  activityLog.push({
    type: "ai",
    level: "info",
    message: `Smart notifications sent for "${food.name}"`,
    actor: "AI Notification Engine",
    role: "system",
    detail: `${interestedUserIds.length} user(s) notified · Hall: ${food.dining_hall || food.location}`,
  });
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

    // ✅ Targeted cache invalidation — only food-related keys
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
                 "status", "donorId", "createdAt"],
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

      // Invalidate food cache after deletion
      await redis.del("availableFood", "stats");

      res.json({ message: "Food item deleted successfully" });
    } catch (err) {
      console.error("DELETE /food/:id error:", err);
      res.status(500).json({ message: "Failed to delete food item" });
    }
  }
);

module.exports = router;
