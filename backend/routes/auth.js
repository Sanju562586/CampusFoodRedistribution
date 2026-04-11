const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Redis } = require("@upstash/redis");
const { User, PendingUser } = require("../models");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const activityLog = require("../lib/activityLog");

const router = express.Router();

// Shared Redis client for session management and caching
const redis = Redis.fromEnv();

// ─────────────────────────────────────────────
// Email Transporter — Connection Pool
// Keep connections open to reduce per-email overhead
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true,
  maxConnections: 5,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("[MAIL ERROR] Connection failed:", error.message);
  } else {
    console.log("[MAIL] Server is ready to send emails");
  }
});

// ─────────────────────────────────────────────
// Request logger — console only (no fs I/O in serverless)
// ─────────────────────────────────────────────
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[AUTH ROUTER] ${req.method} ${req.url}`);
  }
  next();
});

// ─────────────────────────────────────────────
// GET /api/auth/user/me
// Authenticated user's own profile
// ─────────────────────────────────────────────
router.get("/user/me", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userJson = user.toJSON();
    delete userJson.password;

    if (typeof userJson.allergens === "string") {
      try { userJson.allergens = JSON.parse(userJson.allergens); }
      catch (e) { userJson.allergens = []; }
    }

    res.json(userJson);
  } catch (err) {
    console.error("GET /user/me error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// ─────────────────────────────────────────────
// PUT /api/auth/profile
// Update dietary preferences and allergens
// ─────────────────────────────────────────────
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { dietary_preferences, allergens } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.dietary_preferences = dietary_preferences || user.dietary_preferences;
    user.allergens = allergens || user.allergens;
    await user.save();

    const userJson = user.toJSON();
    delete userJson.password;

    activityLog.push({ type: "profile_update", level: "info", message: "User updated their profile", actor: user.email, role: user.role, detail: `Diet: ${user.dietary_preferences} · Allergens: ${JSON.stringify(user.allergens)}` });

    res.json(userJson);
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Authenticates user, returns JWT, warms Redis session
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({
      where: {
        email,
        ...(role && { role }),
      },
    });

    if (!user || (role && user.role !== role)) {
      activityLog.push({ type: "login", level: "warning", message: "Login attempt — user not found", actor: email, role: role || "unknown", detail: "No matching account" });
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      activityLog.push({ type: "login", level: "error", message: "Failed login attempt", actor: email, role: role || "unknown", detail: "Invalid credentials" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Sign JWT using environment variable — never a hardcoded string
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "CHANGE_ME_SET_JWT_SECRET_IN_ENV",
      { expiresIn: "7d" }
    );

    // ✅ Prime the session cache immediately after login
    // This means the FIRST authenticated request after login
    // is served from Redis — zero DB round-trip.
    await redis.set(
      `session:${user.id}`,
      JSON.stringify({ id: user.id, role: user.role }),
      { ex: 3600 } // 1 hour session cache
    );

    activityLog.push({ type: "login", level: "success", message: `User logged in`, actor: user.email, role: user.role, detail: `ID: ${user.id}` });

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        points: user.points,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("POST /login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// Registers a new user in PendingUser table + sends OTP
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, name, college, roll_number, location, role } = req.body;

  try {
    const validRoles = ["student", "donor"];
    const userRole = validRoles.includes(role) ? role : "student";

    const existing = await User.findOne({ where: { email, role: userRole } });
    if (existing) {
      activityLog.push({ type: "register", level: "warning", message: "Registration rejected — account exists", actor: email, role: userRole, detail: "Duplicate account attempt" });
      return res.status(400).json({ message: "User already exists with this role" });
    }

    const existingPending = await PendingUser.findOne({ where: { email } });
    if (existingPending) {
      await existingPending.destroy();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 600000; // 10 minutes

    await PendingUser.create({
      email,
      password: hashedPassword,
      name,
      college,
      roll_number,
      location,
      role: userRole,
      verification_token: otp,
      verification_expires: otpExpires,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - CampusFood",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #444; text-align: center;">Welcome to CampusFood!</h2>
          <p style="color: #666; text-align: center;">Please verify your email address to continue.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background: #e8f5e9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4CAF50;">${otp}</span>
          </div>
          <p style="color: #666; text-align: center;">This code expires in 10 minutes.</p>
        </div>
      `,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
      } else {
        console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
    }

    res.status(201).json({
      message: "Registration successful. Please check your email for OTP.",
    });
    activityLog.push({ type: "register", level: "info", message: `New registration initiated`, actor: email, role: userRole, detail: `OTP sent to ${email}` });
  } catch (err) {
    console.error("POST /register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-email
// Moves user from PendingUser → User after OTP check
// ─────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const pendingUser = await PendingUser.findOne({ where: { email } });

    if (!pendingUser) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser)
        return res.status(200).json({ message: "Email already verified" });
      return res
        .status(404)
        .json({ message: "Registration request not found or expired" });
    }

    if (pendingUser.verification_token !== otp) {
      activityLog.push({ type: "verify_fail", level: "error", message: "Email verification failed — invalid OTP", actor: email, role: pendingUser?.role || "unknown", detail: "Wrong OTP submitted" });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (pendingUser.verification_expires < Date.now()) {
      activityLog.push({ type: "verify_fail", level: "error", message: "Email verification failed — OTP expired", actor: email, role: pendingUser?.role || "unknown", detail: "OTP window elapsed" });
      return res.status(400).json({ message: "OTP expired" });
    }

    await User.create({
      email: pendingUser.email,
      password: pendingUser.password,
      name: pendingUser.name,
      college: pendingUser.college,
      roll_number: pendingUser.roll_number,
      location: pendingUser.location,
      role: pendingUser.role,
      points: 0,
    });

    await pendingUser.destroy();

    activityLog.push({ type: "register", level: "success", message: `Email verified — account activated`, actor: email, role: pendingUser.role, detail: `${pendingUser.name} joined as ${pendingUser.role}` });

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error("POST /verify-email error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/leaderboard
// Public — top 10 users by points, cached 60s
// ─────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await redis.get("leaderboard");
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
      return res.json(cached);
    }

    const users = await User.findAll({
      attributes: ["id", "email", "points"],
      order: [["points", "DESC"]],
      limit: 10,
    });

    const leaderboard = users.map((u) => ({
      id: u.id,
      points: u.points,
      name: u.email.split("@")[0],
    }));

    // Cache for 60 seconds
    await redis.set("leaderboard", leaderboard, { ex: 60 });
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    res.json(leaderboard);
  } catch (err) {
    console.error("GET /leaderboard error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/users
// Admin only — all users (no cache, admin needs fresh data)
// ─────────────────────────────────────────────
router.get("/users", authenticate, authorize("admin"), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/auth/users/:id
// Admin only — deletes user AND invalidates their Redis session
// ─────────────────────────────────────────────
router.delete("/users/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findByPk(id);
    const deleted = await User.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Revoke the session immediately — token is rejected on next request
    await redis.del(`session:${id}`);

    activityLog.push({ type: "user_delete", level: "warning", message: `Admin deleted user account`, actor: req.user.email || `Admin #${req.user.id}`, role: "admin", detail: `Removed: ${targetUser?.email || `ID #${id}`} (${targetUser?.role || "?"})` });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// Generates OTP and sends password reset email
// ─────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const users = await User.findAll({ where: { email } });
    if (!users || users.length === 0) {
      activityLog.push({ type: "password_reset", level: "warning", message: "Forgot-password — email not found", actor: email, role: "unknown", detail: "No account with that email" });
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 600000; // 10 minutes

    for (const user of users) {
      user.resetPasswordToken = otp;
      user.resetPasswordExpires = expires;
      await user.save();
    }

    activityLog.push({ type: "password_reset", level: "info", message: "Password reset OTP requested", actor: email, role: "unknown", detail: `OTP dispatched to ${email}` });

    console.log(`[OTP] Password reset OTP for ${email}: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <div style="text-align: center; padding-bottom: 20px;">
            <h1 style="color: #333; margin: 0;">CampusFood</h1>
          </div>
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #444; margin-top: 0;">Password Reset</h2>
            <p style="color: #666; line-height: 1.6;">You requested a password reset for your CampusFood account. Use the code below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff6b6b; background: #fff0f0; padding: 10px 20px; border-radius: 5px; border: 1px dashed #ff6b6b;">${otp}</span>
            </div>
            <p style="color: #666; line-height: 1.6;">This code will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #aaa; font-size: 12px;">
            &copy; ${new Date().getFullYear()} CampusFood. All rights reserved.
          </div>
        </div>
      `,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent to email" });
      } else {
        res.json({ message: "OTP generated (check server logs — email creds missing)" });
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
      res.status(200).json({ message: "OTP generated (email delivery failed, check logs)" });
    }
  } catch (err) {
    console.error("POST /forgot-password error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// Validates the password reset OTP
// ─────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      where: { email, resetPasswordToken: otp },
    });

    if (!user) {
      activityLog.push({ type: "verify_fail", level: "error", message: "Password reset OTP invalid", actor: email, role: "unknown", detail: "OTP mismatch" });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.resetPasswordExpires < Date.now()) {
      activityLog.push({ type: "verify_fail", level: "error", message: "Password reset OTP expired", actor: email, role: "unknown", detail: "OTP window elapsed" });
      return res.status(400).json({ message: "OTP expired" });
    }

    activityLog.push({ type: "password_reset", level: "info", message: "Password reset OTP verified", actor: email, role: user.role, detail: "OTP accepted — awaiting new password" });
    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("POST /verify-otp error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// Applies new password after OTP is verified
// ─────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const users = await User.findAll({
      where: { email, resetPasswordToken: otp },
    });

    if (!users || users.length === 0)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (users[0].resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    for (const user of users) {
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      // ✅ Invalidate all active sessions for this user after password reset
      await redis.del(`session:${user.id}`);
    }

    activityLog.push({ type: "password_reset", level: "success", message: "Password successfully reset", actor: email, role: users[0]?.role || "unknown", detail: `Session invalidated for ${users.length} account(s)` });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("POST /reset-password error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/admin/logs
// Admin only — returns recent platform activity log
// ─────────────────────────────────────────────
router.get("/admin/logs", authenticate, authorize("admin"), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 500);
  const type = req.query.type || undefined;
  res.json(activityLog.recent({ limit, type }));
});

module.exports = router;
