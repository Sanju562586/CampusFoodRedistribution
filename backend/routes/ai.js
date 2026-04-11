/**
 * ai.js
 * ─────────────────────────────────────────────────────────────
 * CampusFoodRedistribution — AI Command Engine
 *
 * Routes:
 *   GET  /api/ai/recommend        — Personalized food recs (student)
 *   GET  /api/ai/my-impact        — Individual green impact stats (student)
 *   GET  /api/ai/waste-prediction — Platform-wide waste analytics (admin)
 *   POST /api/ai/apply-suggestion — Apply an AI-generated suggestion (admin)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food, Reservation, User } = require("../models");
const { Op } = require("sequelize");
const activityLog   = require("../lib/activityLog");
const userBehavior  = require("../lib/userBehavior");
const { Redis }     = require("@upstash/redis");

const router = express.Router();
const redis  = Redis.fromEnv();

// ─── Gemini ────────────────────────────────────────────────
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

// ══════════════════════════════════════════════════════════════
// GET /api/ai/recommend
// Student only — history-aware, behavior-driven recommendations
// ══════════════════════════════════════════════════════════════
router.get(
  "/recommend",
  authenticate,
  authorize("student"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // 1. Load user profile (preferences + allergens)
      const user = await User.findByPk(userId, {
        attributes: ["dietary_preferences", "allergens", "name"],
      });
      const preferences = {
        diet:     user?.dietary_preferences || "Any",
        allergens: Array.isArray(user?.allergens) ? user.allergens : [],
        name:     user?.name || "Student",
      };

      // 2. Load last 20 reservations as behavioral history
      const history = await Reservation.findAll({
        where:   { userId },
        order:   [["createdAt", "DESC"]],
        limit:   20,
        include: [{
          model: Food,
          attributes: ["name", "dining_hall", "location", "allergens"],
        }],
      });

      const historyItems = history
        .filter(r => r.Food)
        .map(r => ({
          name:   r.Food.name,
          hall:   r.Food.dining_hall || r.Food.location,
          status: r.status,
          qty:    r.quantity,
        }));

      // 3. Load Redis behavioral profile (top halls)
      const behaviorProfile = await userBehavior.getUserProfile(userId);

      // 4. Fetch currently available food
      const availableFood = await Food.findAll({
        where: {
          quantity:    { [Op.gt]: 0 },
          expiry_time: { [Op.gt]: new Date() },
        },
        include: [{
          model: User,
          as:    "donor",
          attributes: ["name", "location"],
        }],
      });

      if (availableFood.length === 0) {
        activityLog.push({ type: "ai", level: "info", message: "AI recommend: no food available", actor: `User #${userId}`, role: "student", detail: "Empty inventory" });
        return res.json({ type: "info", message: "No food available right now.", data: [] });
      }

      // 5. Hard filter: remove allergen conflicts
      const safeFood = availableFood.filter(food => {
        const foodAllergens = (() => {
          try { return JSON.parse(food.allergens || "[]"); }
          catch { return []; }
        })();
        return !foodAllergens.some(a => preferences.allergens.includes(a));
      });

      if (safeFood.length === 0) {
        activityLog.push({ type: "ai", level: "warning", message: "AI recommend: allergen filter blocked all items", actor: `User #${userId}`, role: "student", detail: `Allergens: ${JSON.stringify(preferences.allergens)}` });
        return res.json({ type: "alert", message: "No food found matching your allergen restrictions.", data: [] });
      }

      // 6. Score-based ranking without AI (instant, always works as fallback)
      const scoreRanked = _scoreItems(safeFood, historyItems, behaviorProfile);

      // 7. Gemini — enrich with full context including behavioral history
      try {
        // Use 'gemini-1.5-flash' as primary, fallback to 'gemini-pro' if needed
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are a smart food recommendation system for a campus food redistribution platform.

USER PROFILE:
- Name: ${preferences.name}
- Dietary Preference: ${preferences.diet}
- Allergens to Avoid: ${preferences.allergens.join(", ") || "None"}
- Frequently Visited Halls: ${behaviorProfile.topHalls.join(", ") || "No history yet"}
- Total Past Interactions: ${behaviorProfile.totalInteractions}

RECENT ORDER HISTORY (last 20, most recent first):
${historyItems.length > 0
  ? historyItems.map((h, i) => `${i + 1}. "${h.name}" at ${h.hall} (${h.status}, qty: ${h.qty})`).join("\n")
  : "No history yet — this is a new user"
}

CURRENTLY AVAILABLE FOOD:
${safeFood.map(f => `ID:${f.id} | "${f.name}" | Hall: ${f.dining_hall || f.location} | Qty: ${f.quantity} | Expires: ${f.expiry_time}`).join("\n")}

TASK:
1. Select the TOP 5 food item IDs that best match this user based on:
   - Their dietary preference and allergen restrictions (hard filter already applied)
   - Their hall visit patterns (prefer halls they often visit)
   - Variety (avoid recommending the same food they just had)
   - Urgency (prefer items expiring sooner)
2. Return ONLY a valid JSON object like: {"ids": [3, 7, 1, 5, 2], "reason": "Brief explanation personalised with user name"}
Do NOT include any other text or markdown.`;

        const result   = await model.generateContent(prompt);
        const rawText  = result.response.text().replace(/```json|```/g, "").trim();
        const parsed   = JSON.parse(rawText);
        const ids      = Array.isArray(parsed.ids) ? parsed.ids : [];
        const reason   = parsed.reason || `Personalised picks for ${preferences.name}`;

        const recommended = safeFood.filter(f => ids.includes(f.id));
        const finalData   = recommended.length > 0 ? recommended : scoreRanked.slice(0, 5);

        activityLog.push({ type: "ai", level: "success", message: "Gemini personalised recommendation served", actor: `User #${userId}`, role: "student", detail: `${finalData.length} items · ${reason.substring(0, 80)}` });

        return res.json({
          type:    "personalized",
          message: reason,
          data:    finalData,
        });

      } catch (aiErr) {
        console.error("Gemini failed, falling back to score-ranking:", aiErr.message);
        activityLog.push({ type: "ai", level: "warning", message: "Gemini failed — score-ranking fallback", actor: `User #${userId}`, role: "student", detail: aiErr.message });

        return res.json({
          type:    "scored",
          message: `Top picks based on your history at ${behaviorProfile.topHalls[0] || "campus"}`,
          data:    scoreRanked.slice(0, 5),
        });
      }

    } catch (err) {
      console.error("Recommend error:", err);
      return res.status(500).json({ message: "Recommendation engine error" });
    }
  }
);

/**
 * _scoreItems — pure score-based ranking (no AI needed)
 * Scores each food item based on behavioral signals:
 *   +3  — from a hall the user visits frequently
 *   +2  — never ordered this before (variety bonus)
 *   +1  — expiring soon (urgency bonus)
 */
function _scoreItems(foods, history, behaviorProfile) {
  const visitedHalls  = new Set(behaviorProfile.topHalls.map(h => h.toLowerCase()));
  const orderedNames  = new Set(history.map(h => h.name?.toLowerCase()));
  const now           = Date.now();

  return foods
    .map(food => {
      let score = 0;
      const hall = (food.dining_hall || food.location || "").toLowerCase();

      if (visitedHalls.has(hall))                       score += 3;
      if (!orderedNames.has(food.name?.toLowerCase()))  score += 2;

      const expiresAt = new Date(food.expiry_time).getTime();
      const hoursLeft = (expiresAt - now) / 3_600_000;
      if (hoursLeft < 4)       score += 3;
      else if (hoursLeft < 12) score += 2;
      else if (hoursLeft < 24) score += 1;

      return { ...food.toJSON(), _score: score };
    })
    .sort((a, b) => b._score - a._score);
}

// ══════════════════════════════════════════════════════════════
// GET /api/ai/my-impact
// Student only — individualised green impact analytics
// ══════════════════════════════════════════════════════════════
router.get(
  "/my-impact",
  authenticate,
  authorize("student"),
  async (req, res) => {
    const userId = req.user.id;

    // Check Redis cache first (5-min TTL)
    const cached = await userBehavior.getCachedUserImpact(userId);
    if (cached) return res.json(cached);

    try {
      const CO2_PER_KG    = 2.5;
      const CO2_PER_TREE  = 20;
      const WATER_PER_KG  = 1000; // litres of water saved per kg food
      const MEALS_PER_KG  = 3;    // approx meals per kg of food

      // All reservations by this user
      const reservations = await Reservation.findAll({
        where:   { userId },
        include: [{ model: Food, attributes: ["name", "dining_hall", "location", "expiry_time"] }],
        order:   [["createdAt", "DESC"]],
      });

      const pickedUp   = reservations.filter(r => r.status === "picked_up");
      const totalItems = reservations.length;
      const savedItems = pickedUp.length;

      // Assume ~0.5kg per unit of food
      const savedKg    = pickedUp.reduce((s, r) => s + (r.quantity * 0.5), 0);
      const co2Saved   = (savedKg * CO2_PER_KG).toFixed(1);
      const treesEquiv = (savedKg * CO2_PER_KG / CO2_PER_TREE).toFixed(2);
      const waterSaved = Math.round(savedKg * WATER_PER_KG);
      const mealsSaved = Math.round(savedKg * MEALS_PER_KG);

      // Streak — count consecutive days with at least one pickup
      const streak = _calculateStreak(pickedUp);

      // Top halls from history
      const hallCounts = {};
      for (const r of reservations) {
        const hall = r.Food?.dining_hall || r.Food?.location || "Unknown";
        hallCounts[hall] = (hallCounts[hall] || 0) + 1;
      }
      const topLocations = Object.entries(hallCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hall]) => hall);

      // Points earned from reservations (each reservation = 10 pts)
      const pointsEarned = totalItems * 10;

      // Platform rank (count users with fewer pickups)
      const betterThan = await Reservation.count({
        where:  { status: "picked_up" },
        group:  ["userId"],
        having: { count: { [Op.lt]: savedItems } },
      }).then(rows => rows.length).catch(() => 0);

      // Environmental grade
      const co2Num = parseFloat(co2Saved);
      const envGrade = co2Num >= 50 ? "🌳 Planet Champion" :
                       co2Num >= 20 ? "🌿 Eco Warrior"     :
                       co2Num >= 5  ? "🌱 Green Starter"   : "🌱 Just Getting Started";

      const impact = {
        // Core numbers
        totalReservations: totalItems,
        pickedUpCount:     savedItems,
        savedKg:           savedKg.toFixed(1),
        mealsSaved,
        waterSaved,
        // Environmental
        co2Saved,
        treesEquivalent:   treesEquiv,
        envGrade,
        // Gamification
        pointsEarned,
        streak,
        topLocations,
        // Platform context
        betterThan,
      };

      // Cache for 5 minutes
      await userBehavior.cacheUserImpact(userId, impact);
      activityLog.push({ type: "ai", level: "info", message: "Student My Impact fetched", actor: `User #${userId}`, role: "student", detail: `CO2: ${co2Saved}kg \u00b7 Meals: ${mealsSaved} \u00b7 Streak: ${streak}d` });

      return res.json(impact);
    } catch (err) {
      console.error("My Impact error:", err);
      return res.status(500).json({ message: "Impact engine error" });
    }
  }
);

/** Calculate consecutive pickup days streak */
function _calculateStreak(pickedUpReservations) {
  if (!pickedUpReservations.length) return 0;
  const days = new Set(
    pickedUpReservations.map(r =>
      new Date(r.createdAt).toISOString().slice(0, 10)
    )
  );
  const sorted = Array.from(days).sort().reverse();
  let streak = 0;
  let cursor = new Date();
  for (const day of sorted) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / 86_400_000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

// ══════════════════════════════════════════════════════════════
// GET /api/ai/waste-prediction
// Admin only — platform-wide waste analytics + suggestions
// ══════════════════════════════════════════════════════════════
router.get(
  "/waste-prediction",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const now      = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const potentialWaste = await Food.findAll({
        where: {
          expiry_time: { [Op.between]: [now, nextWeek] },
          quantity:    { [Op.gt]: 0 },
        },
      });

      const totalQuantity = potentialWaste.reduce((sum, f) => sum + f.quantity, 0);
      const atRiskItems   = potentialWaste.length;

      let suggestion     = "Monitor inventory levels.";
      let suggestionType = "NONE";

      const expiringIn24h = await Food.count({
        where: {
          quantity:    { [Op.gt]: 0 },
          expiry_time: { [Op.between]: [now, new Date(now.getTime() + 24 * 60 * 60 * 1000)] },
        },
      });

      if (expiringIn24h > 0) {
        suggestion     = `Run a 'Flash Sale' for ${expiringIn24h} urgent items.`;
        suggestionType = "DISCOUNT";
      } else if (totalQuantity > 20) {
        suggestion     = `High volume detected. Consider donating surplus.`;
        suggestionType = "DONATE";
      }

      const CO2_PER_KG   = 2.5;
      const CO2_PER_TREE = 20;
      const WATER_PER_KG = 1000;

      const savedQuantity  = await Reservation.sum("quantity", { where: { status: "picked_up" } }) || 0;
      const totalReserved  = await Reservation.sum("quantity") || 0;
      const currentAvailable = await Food.sum("quantity", {
        where: { quantity: { [Op.gt]: 0 }, expiry_time: { [Op.gt]: now } },
      }) || 0;
      const expiredWaste   = await Food.sum("quantity", {
        where: { expiry_time: { [Op.lt]: now }, quantity: { [Op.gt]: 0 } },
      }) || 0;

      const totalPosted        = currentAvailable + totalReserved + expiredWaste;
      const savedKg            = savedQuantity * 0.5;
      const savedCO2           = (savedKg * CO2_PER_KG).toFixed(1);
      const potentialWasteCO2  = (totalQuantity * 0.5 * CO2_PER_KG).toFixed(1);
      const treesPlanted       = (savedKg * CO2_PER_KG / CO2_PER_TREE).toFixed(2);
      const waterSaved         = Math.round(savedKg * WATER_PER_KG);
      const mealsSaved         = Math.round(savedKg * 3);

      // Active students count (students who have at least 1 reservation)
      const activeStudents = await Reservation.count({
        distinct: true,
        col:      "userId",
      });

      const responseData = {
        analysis:       atRiskItems > 10 ? "High Waste Risk" : atRiskItems > 0 ? "Moderate Waste Risk" : "Low Waste Risk",
        details:        `Predicted ${totalQuantity} items across ${atRiskItems} categories may go to waste in the next 7 days.`,
        suggestion,
        suggestionType,
        atRiskCount: totalQuantity,
        environmental: {
          savedCO2,
          potentialWasteCO2,
          treesPlanted,
          savedQuantity,
          savedKg: savedKg.toFixed(1),
          waterSaved,
          mealsSaved,
          activeStudents,
        },
        lifecycle: {
          totalPosted,
          currentAvailable,
          totalReserved,
          pickedUp: savedQuantity,
          expiredWaste,
          rescueRate: totalPosted > 0 ? ((savedQuantity / totalPosted) * 100).toFixed(1) : "0.0",
        },
      };

      res.json(responseData);
      activityLog.push({ type: "ai", level: "info", message: "Waste prediction fetched by admin", actor: `Admin #${req.user.id}`, role: "admin", detail: `${atRiskItems} at-risk \u00b7 ${totalQuantity} units \u00b7 ${suggestionType}` });
    } catch (err) {
      console.error(err);
      activityLog.push({ type: "ai", level: "error", message: "Waste prediction engine error", actor: `Admin #${req.user.id}`, role: "admin", detail: err.message });
      res.status(500).json({ message: "Analytics Offline" });
    }
  }
);

// ══════════════════════════════════════════════════════════════
// POST /api/ai/apply-suggestion
// Admin only
// ══════════════════════════════════════════════════════════════
router.post("/apply-suggestion", authenticate, authorize("admin"), async (req, res) => {
  const { type } = req.body;
  const now = new Date();

  try {
    let message      = "No action taken.";
    let affectedCount = 0;

    if (type === "DISCOUNT") {
      const urgentItems = await Food.findAll({
        where: {
          quantity:    { [Op.gt]: 0 },
          expiry_time: { [Op.between]: [now, new Date(now.getTime() + 24 * 60 * 60 * 1000)] },
        },
      });
      for (const item of urgentItems) {
        if (item.price > 0) item.price = Math.max(0, parseFloat((item.price * 0.5).toFixed(2)));
        if (!item.name.includes("[SALE]")) item.name = `[SALE] ${item.name}`;
        await item.save();
      }
      affectedCount = urgentItems.length;
      message       = `Successfully discounted ${affectedCount} urgent items.`;

    } else if (type === "DONATE") {
      const surplusItems = await Food.findAll({
        where: { quantity: { [Op.gt]: 5 }, expiry_time: { [Op.gt]: now } },
      });
      for (const item of surplusItems) {
        if (!item.name.includes("[PRIORITY]")) {
          item.name = `[PRIORITY] ${item.name}`;
          await item.save();
        }
      }
      affectedCount = surplusItems.length;
      message       = `Marked ${affectedCount} items for priority donation.`;
    }

    res.json({ message, affectedCount });
    activityLog.push({ type: "ai", level: affectedCount > 0 ? "success" : "warning", message: `AI suggestion applied: ${type}`, actor: `Admin #${req.user.id}`, role: "admin", detail: `${affectedCount} item(s) affected · ${message}` });
  } catch (err) {
    console.error(err);
    activityLog.push({ type: "ai", level: "error", message: "Apply-suggestion failed", actor: `Admin #${req.user.id}`, role: "admin", detail: err.message });
    res.status(500).json({ message: "Failed to apply suggestion" });
  }
});

module.exports = router;
