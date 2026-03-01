const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { Reservation, Food, User, sequelize } = require("../models");
const { randomUUID } = require("crypto");
const QRCode = require("qrcode");

const router = express.Router();

/**
 * POST /api/reservation/create
 * Student only
 */
router.post(
    "/create",
    authenticate,
    authorize("student"),
    async (req, res) => {
        const { foodId, quantity } = req.body;
        const userId = req.user.id;

        if (!foodId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const t = await sequelize.transaction();

        try {
            // 1. Find Food
            const food = await Food.findByPk(foodId, { transaction: t });

            if (!food) {
                await t.rollback();
                return res.status(404).json({ message: "Food not found" });
            }

            // 2. Check Availability
            if (food.quantity < quantity) {
                await t.rollback();
                return res.status(400).json({ message: "Not enough quantity available" });
            }

            // 3. Decrement Quantity
            food.quantity -= quantity;
            await food.save({ transaction: t });

            // 4. Create Reservation
            const code = randomUUID().substring(0, 8).toUpperCase();
            const reservation = await Reservation.create(
                {
                    userId,
                    foodId,
                    quantity,
                    status: "reserved",
                    reservation_code: code,
                },
                { transaction: t }
            );

            // 5. Award Points
            await User.increment("points", { by: 10, where: { id: userId }, transaction: t });

            await t.commit();

            // Emit update event
            req.io.emit("food_update", { foodId, quantity: food.quantity });

            // Generate QR
            const qrCodeUrl = await QRCode.toDataURL(code);

            res.status(201).json({
                message: "Reservation successful",
                reservation,
                qrCodeUrl,
            });
        } catch (err) {
            await t.rollback();
            console.error(err);
            res.status(500).json({ message: "Reservation failed" });
        }
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
                return res.status(404).json({ message: "Reservation not found" });
            }

            if (reservation.status === "picked_up") {
                return res.status(400).json({ message: "Already picked up" });
            }

            if (reservation.status === "cancelled") {
                return res.status(400).json({ message: "Reservation cancelled" });
            }

            reservation.status = "picked_up";
            await reservation.save();

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
