const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food } = require("../models");
const { Op } = require("sequelize");
const NodeCache = require("node-cache");

// Initialize rapid in-memory caching with 5 seconds Time-To-Live
const foodCache = new NodeCache({ stdTTL: 5, checkperiod: 2 });

const router = express.Router();

// Admin food stats
router.get("/stats", authenticate, authorize("admin"), async (req, res) => {
  try {
    const cachedStats = foodCache.get("stats");
    if (cachedStats) return res.json(cachedStats);

    const now = new Date();
    const activeCount = await Food.count({
      where: {
        expiry_time: { [Op.gt]: now },
        quantity: { [Op.gt]: 0 }
      }
    });
    
    foodCache.set("stats", { activeCount });
    res.json({ activeCount });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

/**
 * POST /api/food/create
 * Admin only
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
      const food = await Food.create({
        name,
        quantity,
        expiry_time,
        dining_hall,
        allergens: JSON.stringify(allergens || []),
        donorId: req.user.role === 'donor' ? req.user.id : null,
        location: location || dining_hall, // Fallback location to dining_hall if not explicit
        landmark: landmark || null,
        image_url: image_url || null,
        price: price || 0,
        status: 'available'
      });

      const foodJson = food.toJSON();
      try {
        foodJson.allergens = typeof foodJson.allergens === 'string' ? JSON.parse(foodJson.allergens) : foodJson.allergens;
      } catch (e) {
        foodJson.allergens = [];
      }
      req.io.emit("food_added", foodJson);

      // Invalidate the cache to instantly reflect new posts
      foodCache.flushAll();

      res.status(201).json(food);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create food" });
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
      const cachedAvailable = foodCache.get("availableFood");
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

      foodCache.set("availableFood", formattedFood);
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
