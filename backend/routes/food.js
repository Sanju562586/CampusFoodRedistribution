const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food } = require("../models");
const { Op } = require("sequelize");
const { Redis } = require("@upstash/redis");

// Initialize rapid global distributed caching 
const redis = Redis.fromEnv();

const router = express.Router();
const { Client } = require("@upstash/qstash");

// Admin food stats
router.get("/stats", authenticate, authorize("admin"), async (req, res) => {
  try {
    const cachedStats = await redis.get("stats");
    if (cachedStats) return res.json(cachedStats);

    const now = new Date();
    const activeCount = await Food.count({
      where: {
        expiry_time: { [Op.gt]: now },
        quantity: { [Op.gt]: 0 }
      }
    });
    
    // Cache for 5 seconds remotely
    await redis.set("stats", { activeCount }, { ex: 5 });
    res.json({ activeCount });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

/**
 * POST /api/food/create
 * Admin/Donor only - Pushes to QStash Message Queue
 */
router.post(
  "/create",
  authenticate,
  authorize(["donor"]),
  async (req, res) => {
    const { name, quantity, expiry_time, dining_hall, allergens, location, landmark, image_url, price } = req.body;

    if (!name) return res.status(400).json({ message: "Missing field: Food Name" });
    if (quantity === undefined || quantity === null) return res.status(400).json({ message: "Missing field: Quantity" });
    if (!expiry_time) return res.status(400).json({ message: "Missing field: Expiry Time" });
    if (!dining_hall && !location) return res.status(400).json({ message: "Missing field: Location/Dining Hall" });

    try {
      // 1. Prepare Payload for QStash
      const payload = {
        name,
        quantity,
        expiry_time,
        dining_hall,
        allergens: allergens || [],
        donorId: req.user.role === 'donor' ? req.user.id : null,
        location: location || dining_hall,
        landmark: landmark || null,
        image_url: image_url || null,
        price: price || 0,
        status: 'available'
      };

      // 2. Check if QStash is configured
      if (!process.env.QSTASH_TOKEN || process.env.QSTASH_TOKEN === 'add_your_token_here') {
         console.warn("⚠️ QSTASH_TOKEN is missing. Bypassing queue and executing direct DB write.");
         return await directFoodCreate(payload, req.pusher, res);
      }

      // 3. Publish to QStash to protect database from write spikes
      const qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
      const targetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/food/worker-create`;
      
      await qstashClient.publishJSON({
        url: targetUrl,
        body: payload,
      });

      // 4. Return instant 202 Accepted to the client (< 50ms)
      res.status(202).json({ message: "Food creation queued successfully" });
    } catch (err) {
      console.error("QStash Publish Error:", err);
      res.status(500).json({ message: "Failed to queue food creation" });
    }
  }
);

/**
 * Fallback / Helper logic for direct database writes
 */
async function directFoodCreate(payload, pusherClient, res) {
  try {
     const food = await Food.create({
        ...payload,
        allergens: JSON.stringify(payload.allergens)
     });

     const foodJson = food.toJSON();
     try {
       foodJson.allergens = typeof foodJson.allergens === 'string' ? JSON.parse(foodJson.allergens) : foodJson.allergens;
     } catch (e) {
       foodJson.allergens = [];
     }
     if (pusherClient) pusherClient.trigger("food-channel", "food_added", foodJson);
     await redis.flushall();
     
     if (res) return res.status(201).json(food);
  } catch (err) {
     console.error(err);
     if (res) return res.status(500).json({ message: "Failed to create food" });
  }
}

/**
 * POST /api/food/worker-create
 * QStash Webhook Receiver (Internal Route)
 */
router.post(
  "/worker-create",
  async (req, res) => {
    // Note: In production, verify the QStash signature here using @upstash/qstash Receiver securely
    console.log("📥 QStash Worker received payload for Food Creation");
    
    try {
      const payload = req.body;
      
      const food = await Food.create({
        ...payload,
        allergens: JSON.stringify(payload.allergens || [])
      });

      const foodJson = food.toJSON();
      try {
        foodJson.allergens = typeof foodJson.allergens === 'string' ? JSON.parse(foodJson.allergens) : foodJson.allergens;
      } catch (e) {
        foodJson.allergens = [];
      }
      
      // Trigger realtime update
      req.pusher.trigger("food-channel", "food_added", foodJson);

      // Invalidate the cache system-wide
      await redis.flushall();

      res.status(200).json({ message: "Worker successfully resolved operation." });
    } catch (err) {
      console.error("Worker Execution Error:", err);
      res.status(500).json({ message: "Worker operation failed" });
    }
  }
);

/**
 * GET /api/food/available
 * Student only
 */
router.get(
  "/available",
  authenticate,
  authorize(["student", "admin"]),
  async (req, res) => {
    try {
      const cachedAvailable = await redis.get("availableFood");
      if (cachedAvailable) return res.json(cachedAvailable);

      const now = new Date();
      const availableFood = await Food.findAll({
        where: {
          expiry_time: { [Op.gt]: now },
          quantity: { [Op.gt]: 0 },
        },
      });

      // Parse allergens safely
      const formattedFood = availableFood.map(f => {
        const json = f.toJSON();
        let parsedAllergens = [];
        try {
          if (typeof json.allergens === 'string') parsedAllergens = JSON.parse(json.allergens || "[]");
          else if (Array.isArray(json.allergens)) parsedAllergens = json.allergens;
        } catch(e) { parsedAllergens = []; }
        return { ...json, allergens: parsedAllergens };
      });

      // Cache for 5 seconds remotely
      await redis.set("availableFood", formattedFood, { ex: 5 });
      res.json(formattedFood);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch food" });
    }
  }
);

/**
 * GET /api/food/all
 * Admin only
 */
router.get(
  "/all",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const allFood = await Food.findAll({
        order: [['createdAt', 'DESC']],
        include: [{
          model: require('../models').User,
          as: 'donor',
          attributes: ['name', 'email']
        }]
      });

      // Parse allergens safely
      const formattedFood = allFood.map(f => {
        const json = f.toJSON();
        let parsedAllergens = [];
        try {
          if (typeof json.allergens === 'string') parsedAllergens = JSON.parse(json.allergens || "[]");
          else if (Array.isArray(json.allergens)) parsedAllergens = json.allergens;
        } catch(e) { parsedAllergens = []; }
        return { ...json, allergens: parsedAllergens };
      });

      res.json(formattedFood);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch all food" });
    }
  }
);

/**
 * GET /api/food/my-listings
 * Donor & Admin only
 */
router.get(
  "/my-listings",
  authenticate,
  authorize(["donor"]),
  async (req, res) => {
    try {
      const foods = await Food.findAll({
        where: { donorId: req.user.id },
        order: [['createdAt', 'DESC']],
        include: [{
          model: require('../models').Reservation,
          required: false,
          include: [{
            model: require('../models').User,
            attributes: ['name', 'college', 'roll_number']
          }]
        }]
      });
      res.json(foods);
    } catch (err) {
      console.error("Fetch history error:", err);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  }
);

/**
 * DELETE /api/food/:id
 * Admin only
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Food.destroy({ where: { id } });
      if (!deleted) return res.status(404).json({ message: "Food item not found" });
      res.json({ message: "Food item deleted successfully" });
    } catch (err) {
      console.error("Delete food error:", err);
      res.status(500).json({ message: "Failed to delete food item" });
    }
  }
);

module.exports = router;
