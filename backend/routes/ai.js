const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Food, sequelize, Reservation } = require("../models");
const { Op } = require("sequelize");
const activityLog = require("../lib/activityLog");

const router = express.Router();

/**
 * GET /api/ai/recommend
 * Student only
 * Uses a heuristic (Expiring Soon) to suggest food.
 */
// Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

/**
 * GET /api/ai/recommend
 * Student only
 * Uses Gemini AI to match food with user preferences.
 */
router.get(
    "/recommend",
    authenticate,
    authorize("student"),
    async (req, res) => {
        try {
            const user = await require('../models').User.findByPk(req.user.id); // Get latest preferences
            const preferences = {
                diet: user.dietary_preferences,
                allergens: user.allergens || []
            };

            // 1. Fetch available food
            const availableFood = await Food.findAll({
                where: { quantity: { [Op.gt]: 0 }, expiry_time: { [Op.gt]: new Date() } },
                include: [{ model: require('../models').User, as: 'donor', attributes: ['name', 'location'] }]
            });

            if (availableFood.length === 0) {
                activityLog.push({ type: "ai", level: "info", message: "AI recommend: no food available", actor: `User #${req.user.id}`, role: "student", detail: "Empty inventory" });
                return res.json({ type: "info", message: "No food available right now.", data: [] });
            }

            // 2. Filter by Allergens (Hard filter)
            const safeFood = availableFood.filter(food => {
                const foodAllergens = JSON.parse(food.allergens || "[]");
                const hasAllergen = foodAllergens.some(a => preferences.allergens.includes(a));
                return !hasAllergen;
            });

            if (safeFood.length === 0) {
                activityLog.push({ type: "ai", level: "warning", message: "AI recommend: all items blocked by allergen filter", actor: `User #${req.user.id}`, role: "student", detail: `Allergens: ${JSON.stringify(preferences.allergens)}` });
                return res.json({ type: "alert", message: "No food found matching your allergen restrictions.", data: [] });
            }

            // 3. AI Ranking / Heuristic Fallback
            // If user has no specific preferences, use expiry heuristic
            if (!preferences.diet || preferences.diet === "Any") {
                const expiringSoon = safeFood.sort((a, b) => new Date(a.expiry_time) - new Date(b.expiry_time)).slice(0, 3);
                activityLog.push({ type: "ai", level: "success", message: "AI recommend: heuristic expiry-based picks returned", actor: `User #${req.user.id}`, role: "student", detail: `${expiringSoon.length} items (no diet pref set)` });
                return res.json({
                    type: "general",
                    message: "Fresh food available now!",
                    data: expiringSoon
                });
            }

            // Use AI to rank safe food based on diet
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `
                    User Preferences:
                    - Diet: ${preferences.diet}
                    - Allergens to Avoid: ${preferences.allergens.join(", ")}

                    Available Food Items (JSON):
                    ${JSON.stringify(safeFood.map(f => ({ id: f.id, name: f.name, dining_hall: f.dining_hall, allergens: f.allergens })))}

                    Task:
                    Select the top 3 food items that strictly match the user's diet (Veg/Non-Veg).
                    Prioritize items that fit the diet.
                    Return ONLY a JSON array of their IDs, e.g., [1, 5, 2].
                    If none match perfectly, return IDs of safest alternatives.
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().replace(/```json|```/g, '').trim();
                const recommendedIds = JSON.parse(text);

                const recommended = safeFood.filter(f => recommendedIds.includes(f.id));

                // Fallback if AI returns empty or invalid IDs
                const finalData = recommended.length > 0 ? recommended : safeFood.slice(0, 3);

                activityLog.push({ type: "ai", level: "success", message: "AI personalized food recommendation served", actor: `User #${req.user.id}`, role: "student", detail: `${finalData.length} items · diet: ${preferences.diet}` });

                res.json({
                    type: "personalized",
                    message: `Recommended based on your ${preferences.diet} preference`,
                    data: finalData
                });

            } catch (aiError) {
                console.error("AI Ranking failed, falling back to simple filter", aiError);
                activityLog.push({ type: "ai", level: "warning", message: "Gemini AI ranking failed — fallback activated", actor: `User #${req.user.id}`, role: "student", detail: aiError.message });
                // Fallback: Simple filter by diet
                const dietMatches = safeFood.filter(f => {
                    return true;
                }).sort((a, b) => new Date(a.expiry_time) - new Date(b.expiry_time)).slice(0, 3);

                res.json({
                    type: "fallback",
                    message: "Top picks for you",
                    data: dietMatches
                });
            }

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Recommendation engine error" });
        }
    }
);

/**
 * GET /api/ai/waste-prediction
 * Admin only
 * Predicts potential waste in next 7 days.
 */
router.get(
    "/waste-prediction",
    authenticate,
    authorize("admin"),
    async (req, res) => {
        try {
            const now = new Date();
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const potentialWaste = await Food.findAll({
                where: {
                    expiry_time: {
                        [Op.between]: [now, nextWeek]
                    },
                    quantity: { [Op.gt]: 0 }
                }
            });

            const totalQuantity = potentialWaste.reduce((sum, f) => sum + f.quantity, 0);
            const atRiskItems = potentialWaste.length;

            // 5. Dynamic Suggestion Logic
            let suggestion = "Monitor inventory levels.";
            let suggestionType = "NONE";

            const expiringIn24h = await Food.count({
                where: {
                    quantity: { [Op.gt]: 0 },
                    expiry_time: { [Op.between]: [now, new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                }
            });

            if (expiringIn24h > 0) {
                suggestion = `Run a 'Flash Sale' for ${expiringIn24h} urgent items.`;
                suggestionType = "DISCOUNT";
            } else if (totalQuantity > 20) {
                suggestion = `High volume detected. Consider donating surplus.`;
                suggestionType = "DONATE";
            }

            // Environmental Impact Calculation
            const CO2_PER_KG = 2.5; // kg CO2 per kg food (approx)
            const CO2_PER_TREE = 20; // kg CO2 absorbed per tree per year

            // 1. Calculate Saved Food (Picked Up Reservations)
            const savedQuantity = await Reservation.sum('quantity', {
                where: { status: 'picked_up' }
            }) || 0;

            // 2. Calculate Total Reserved (Picked Up + Reserved + Cancelled maybe?)
            // For "Total Posted", we want everything that was ever listed.
            // Since we don't store initial_quantity, we approximation:
            // Total Posted = Current Available + Total Reserved (All time)
            const totalReserved = await Reservation.sum('quantity') || 0;

            // 3. Current Available
            const currentAvailable = await Food.sum('quantity', {
                where: {
                    quantity: { [Op.gt]: 0 },
                    expiry_time: { [Op.gt]: now }
                }
            }) || 0;

            // 4. Leftover / Expired Waste
            const expiredWaste = await Food.sum('quantity', {
                where: {
                    expiry_time: { [Op.lt]: now },
                    quantity: { [Op.gt]: 0 }
                }
            }) || 0;

            const totalPosted = currentAvailable + totalReserved + expiredWaste;

            const savedCO2 = (savedQuantity * CO2_PER_KG).toFixed(1);
            const potentialWasteCO2 = (totalQuantity * CO2_PER_KG).toFixed(1);
            const treesPlanted = (savedCO2 / CO2_PER_TREE).toFixed(1);

            res.json({
                analysis: atRiskItems > 10 ? "High Waste Risk" : (atRiskItems > 0 ? "Moderate Waste Risk" : "Low Waste Risk"),
                details: `Predicted ${totalQuantity} items across ${atRiskItems} categories may go to waste in the next 7 days.`,
                suggestion,
                suggestionType,
                atRiskCount: totalQuantity,
                environmental: {
                    savedCO2,
                    potentialWasteCO2,
                    treesPlanted,
                    savedQuantity
                },
                lifecycle: {
                    totalPosted,
                    currentAvailable,
                    totalReserved,
                    pickedUp: savedQuantity,
                    expiredWaste
                }
            });
            activityLog.push({ type: "ai", level: "info", message: "Waste prediction fetched by admin", actor: `Admin #${req.user.id}`, role: "admin", detail: `${atRiskItems} at-risk items · ${totalQuantity} units · ${suggestionType || "NONE"} suggested` });
        } catch (err) {
            console.error(err);
            activityLog.push({ type: "ai", level: "error", message: "Waste prediction engine error", actor: `Admin #${req.user.id}`, role: "admin", detail: err.message });
            res.status(500).json({ message: "Analytics Offline" });
        }
    }
);



/**
 * POST /api/ai/apply-suggestion
 * Admin only
 */
router.post("/apply-suggestion", authenticate, authorize("admin"), async (req, res) => {
    const { type } = req.body;
    const now = new Date();

    try {
        let message = "No action taken.";
        let affectedCount = 0;

        if (type === "DISCOUNT") {
            const urgentItems = await Food.findAll({
                where: {
                    quantity: { [Op.gt]: 0 },
                    expiry_time: { [Op.between]: [now, new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                }
            });

            for (const item of urgentItems) {
                // Discount 50%
                if (item.price > 0) item.price = Math.max(0, (item.price * 0.5).toFixed(2));
                if (!item.name.includes("[SALE]")) item.name = `[SALE] ${item.name}`;
                await item.save();
            }
            affectedCount = urgentItems.length;
            message = `Successfully discounted ${affectedCount} urgent items.`;

        } else if (type === "DONATE") {
            const surplusItems = await Food.findAll({
                where: { quantity: { [Op.gt]: 5 }, expiry_time: { [Op.gt]: now } }
            });

            for (const item of surplusItems) {
                if (!item.name.includes("[PRIORITY]")) {
                    item.name = `[PRIORITY] ${item.name}`;
                    await item.save();
                }
            }
            affectedCount = surplusItems.length;
            message = `Marked ${affectedCount} items for priority donation.`;
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
