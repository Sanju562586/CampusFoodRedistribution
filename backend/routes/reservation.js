const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Reservation, Food, User, sequelize } = require("../models");
const { randomUUID } = require("crypto");
const QRCode = require("qrcode");
const { Client } = require("@upstash/qstash");
const activityLog = require("../lib/activityLog");
const userBehavior = require("../lib/userBehavior");

const router = express.Router();

/**
 * POST /api/reservation/create
 * Student only - Pushes to QStash Message Queue
 */
router.post(
    "/create",
    authenticate,
    authorize("student"),
    async (req, res) => {
        const { foodId, quantity } = req.body;
        const userId = req.user.id;

        if (!foodId || !quantity || quantity <= 0) {
            activityLog.push({ type: "reservation", level: "error", message: "Reservation rejected — invalid parameters", actor: `User #${req.user.id}`, role: "student", detail: `foodId=${foodId} qty=${quantity}` });
            return res.status(400).json({ message: "Invalid request" });
        }

        const code = randomUUID().substring(0, 8).toUpperCase();
        const payload = { foodId, quantity, userId, code };

        try {
            // Check if QStash is configured
            if (!process.env.QSTASH_TOKEN || process.env.QSTASH_TOKEN === 'add_your_token_here') {
                console.warn("⚠️ QSTASH_TOKEN is missing. Bypassing queue and executing direct DB write.");
                return await directReservationCreate(payload, req.pusher, res);
            }

            // Publish to QStash to protect database from write spikes
            const qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
            const targetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/reservation/worker-create`;
            
            await qstashClient.publishJSON({
                url: targetUrl,
                body: payload,
            });

            // Return mock reservation object instantly (< 50ms)
            const qrCodeUrl = await QRCode.toDataURL(code);
            activityLog.push({ type: "reservation", level: "info", message: `Reservation queued via QStash`, actor: `User #${userId}`, role: "student", detail: `Food #${foodId} · Qty: ${quantity} · Code: ${code}` });
            res.status(202).json({
                message: "Reservation queued successfully",
                reservation: {
                    userId,
                    foodId,
                    quantity,
                    status: "processing_queue",
                    reservation_code: code,
                },
                qrCodeUrl,
            });
        } catch (err) {
            console.error("QStash Publish Error:", err);
            activityLog.push({ type: "reservation", level: "error", message: "QStash publish failed for reservation", actor: `User #${userId}`, role: "student", detail: err.message });
            res.status(500).json({ message: "Failed to queue reservation" });
        }
    }
);

/**
 * Fallback / Helper logic for direct database writes
 */
async function directReservationCreate({ foodId, quantity, userId, code }, pusherClient, res) {
    const t = await sequelize.transaction();
    try {
        const food = await Food.findByPk(foodId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!food) {
            await t.rollback();
            activityLog.push({ type: "reservation", level: "error", message: "Reservation failed — food not found", actor: `User #${userId}`, role: "student", detail: `Food #${foodId} does not exist` });
            return res ? res.status(404).json({ message: "Food not found" }) : null;
        }
        if (food.quantity < quantity) {
            await t.rollback();
            activityLog.push({ type: "reservation", level: "warning", message: `Reservation failed — insufficient quantity`, actor: `User #${userId}`, role: "student", detail: `Requested: ${quantity} · Available: ${food.quantity} of "${food.name}"` });
            return res ? res.status(400).json({ message: "Not enough quantity available" }) : null;
        }

        food.quantity -= quantity;
        await food.save({ transaction: t });

        const reservation = await Reservation.create(
            { userId, foodId, quantity, status: "reserved", reservation_code: code },
            { transaction: t }
        );

        await User.increment("points", { by: 10, where: { id: userId }, transaction: t });
        await t.commit();

        if (pusherClient) pusherClient.trigger("food-channel", "food_update", { foodId, quantity: food.quantity });

        activityLog.push({
          type: "reservation",
          level: "success",
          message: `Food reserved: ${food.name}`,
          actor: `User #${userId}`,
          role: "student",
          detail: `Code: ${code} · Qty: ${quantity}`,
        });

        // 🧠 Feed the behavioral brain — record this interaction for smarter future recs
        const user = await User.findByPk(userId, { attributes: ["dietary_preferences"] });
        userBehavior.recordInteraction(userId, food, user?.dietary_preferences || "Any").catch(() => {});

        const qrCodeUrl = await QRCode.toDataURL(code);
        if (res) {
            res.status(201).json({ message: "Reservation successful", reservation, qrCodeUrl });
        }
    } catch (err) {
        await t.rollback();
        console.error(err);
        if (res) res.status(500).json({ message: "Reservation failed" });
    }
}

/**
 * POST /api/reservation/worker-create
 * QStash Webhook Receiver (Internal Route)
 */
router.post(
    "/worker-create",
    async (req, res) => {
        // Note: Verify the QStash signature here in production
        console.log("📥 QStash Worker received payload for Reservation");
        activityLog.push({ type: "system", level: "info", message: "QStash worker processing reservation", actor: "QStash Worker", role: "system", detail: `foodId=${req.body?.foodId} userId=${req.body?.userId}` });
        
        const payload = req.body;
        // Don't pass res, handled asynchronously
        await directReservationCreate(payload, req.pusher, null);
        
        res.status(200).json({ message: "Worker successfully resolved operation." });
    }
);

/**
 * GET /api/reservation/my
 * Student only
 */
router.get(
    "/my",
    authenticate,
    authorize("student"),
    async (req, res) => {
        try {
            const reservations = await Reservation.findAll({
                where: { userId: req.user.id },
                include: [{ model: Food }],
                order: [["createdAt", "DESC"]],
            });

            // Attach QR codes
            const data = await Promise.all(reservations.map(async (r) => {
                const qrCodeUrl = await QRCode.toDataURL(r.reservation_code);
                return { ...r.toJSON(), qrCodeUrl };
            }));

            activityLog.push({ type: "data_fetch", level: "info", message: `Student fetched their reservations`, actor: `User #${req.user.id}`, role: "student", detail: `${reservations.length} reservation(s) returned` });

            res.json(data);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch reservations" });
        }
    }
);

/**
 * POST /api/reservation/pickup
 * Admin only
 */
router.post(
    "/pickup",
    authenticate,
    authorize(["donor", "admin"]),
    async (req, res) => {
        const { reservation_code } = req.body;

        try {
            const reservation = await Reservation.findOne({
                where: { reservation_code },
                include: [
                    { model: Food },
                    {
                        model: User,
                        attributes: ['name', 'email', 'roll_number']
                    }
                ],
            });

            if (!reservation) {
                activityLog.push({ type: "pickup", level: "warning", message: "Pickup attempted — code not found", actor: `User #${req.user.id}`, role: req.user.role, detail: `Code: ${reservation_code}` });
                return res.status(404).json({ message: "Reservation not found" });
            }

            if (reservation.status === "picked_up") {
                activityLog.push({ type: "pickup", level: "warning", message: "Pickup attempted — already picked up", actor: reservation.User?.email || `User #${reservation.userId}`, role: "student", detail: `Code: ${reservation_code}` });
                return res.status(400).json({ message: "Already picked up" });
            }

            if (reservation.status === "cancelled") {
                activityLog.push({ type: "pickup", level: "error", message: "Pickup attempted — reservation is cancelled", actor: reservation.User?.email || `User #${reservation.userId}`, role: "student", detail: `Code: ${reservation_code}` });
                return res.status(400).json({ message: "Reservation cancelled" });
            }

            reservation.status = "picked_up";
            await reservation.save();

            activityLog.push({
              type: "pickup",
              level: "success",
              message: `Pickup confirmed: ${reservation.Food?.name || "food item"}`,
              actor: reservation.User?.email || `User #${reservation.userId}`,
              role: "student",
              detail: `Code: ${reservation_code}`,
            });

            // 🧠 Reinforce the behavioral signal on actual pickup (stronger signal than reserve)
            userBehavior.recordInteraction(
              reservation.userId,
              reservation.Food,
              reservation.User?.dietary_preferences || "Any"
            ).catch(() => {});

            res.json({
                message: "Pickup confirmed",
                reservation
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Pickup verification failed" });
        }
    }
);

module.exports = router;
