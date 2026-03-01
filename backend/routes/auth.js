const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { User, PendingUser } = require("../models");

const { authenticate } = require("../middleware/authMiddleware");

// ... existing code ...

const router = express.Router();

// Global Transporter with Connection Pooling to reduce latency
const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true, // Keep connections open
  maxConnections: 5,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("[MAIL ERROR] Connection failed:", error);
  } else {
    console.log("[MAIL] Server is ready to send emails");
  }
});

router.use((req, res, next) => {
  const msg = `[AUTH ROUTER] ${req.method} ${req.url}\n`;
  try { require('fs').appendFileSync('auth_debug.log', msg); } catch (e) { }
  console.log(msg);
  next();
});

// ... existing code ...

/**
 * GET /api/auth/user/me
 * Fetch authenticated user profile
 */
router.get("/user/me", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userJson = user.toJSON();
    delete userJson.password;

    // Ensure JSON fields are parsed if they are strings (SQLite workaround sometimes needed)
    if (typeof userJson.allergens === 'string') {
      userJson.allergens = JSON.parse(userJson.allergens);
    }

    res.json(userJson);
  } catch (err) {
    console.error("Fetch me error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile (dietary preferences, allergens)
 */
// ... existing code ...
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { dietary_preferences, allergens } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.dietary_preferences = dietary_preferences || user.dietary_preferences;
    user.allergens = allergens || user.allergens;

    await user.save();

    // Return updated user without password
    const userJson = user.toJSON();
    delete userJson.password;

    res.json(userJson);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// 🔐 LOGIN
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body; // Expect role from frontend

  try {
    // Find user by email AND role (since email is no longer unique globally)
    // If role is not provided, we might default to 'student' or handle error, 
    // but frontend sends it.
    const user = await User.findOne({
      where: {
        email,
        ...(role && { role })
      }
    });

    const fs = require('fs');
    const logFile = 'login_debug.log';

    // User not found OR Role mismatch (Isolate login portals)
    // If an Admin tries to log in via Student page (role='student'), reject it.
    if (!user || (role && user.role !== role)) {
      const msg = `[LOGIN FAILED] User not found or Role Mismatch. Email: ${email}, Role: ${role}, FoundRole: ${user ? user.role : 'None'}\n`;
      fs.appendFileSync(logFile, msg);
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    const debugMsg = `
[LOGIN DEBUG] Time: ${new Date().toISOString()}
[LOGIN DEBUG] Checking User: ${user.email} (Role: ${user.role})
[LOGIN DEBUG] Password Input: ${password}
[LOGIN DEBUG] Valid: ${valid}
------------------------------------------------
`;
    fs.appendFileSync(logFile, debugMsg);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📝 REGISTER
router.post("/register", async (req, res) => {
  const { email, password, name, college, roll_number, location, role } = req.body;

  try {
    // Allow only student or donor registration via this public endpoint
    const validRoles = ['student', 'donor'];
    const userRole = validRoles.includes(role) ? role : 'student';

    const existing = await User.findOne({ where: { email, role: userRole } });
    if (existing) {
      return res.status(400).json({ message: "User already exists with this role" });
    }

    const existingPending = await PendingUser.findOne({ where: { email } });
    if (existingPending) {
      await existingPending.destroy();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
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
      verification_expires: otpExpires
    });

    // Send Verification Email
    // Used global transporter instance to avoid reconnection overhead

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - CampusFood',
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
              <h2 style="color: #444; text-align: center;">Welcome to CampusFood!</h2>
              <p style="color: #666; text-align: center;">Please verify your email address to continue.</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background: #e8f5e9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4CAF50;">${otp}</span>
              </div>
              <p style="color: #666; text-align: center;">This code expires in 10 minutes.</p>
            </div>
        `
    };

    // Send Verification Email
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
      } else {
        console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      // We don't block registration on email fail in DEV, but in PROD we might want to.
      // For now, proceeding but logging error.
    }

    res.status(201).json({ message: "Registration successful. Please check your email for OTP." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/verify-email
 */
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const pendingUser = await PendingUser.findOne({ where: { email } });

    if (!pendingUser) {
      // If not in pending, check if already verified/active
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) return res.status(200).json({ message: "Email already verified" });

      return res.status(404).json({ message: "Registration request not found or expired" });
    }

    if (pendingUser.verification_token !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (pendingUser.verification_expires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Move to Real Users Table
    await User.create({
      email: pendingUser.email,
      password: pendingUser.password, // Already hashed
      name: pendingUser.name,
      college: pendingUser.college,
      roll_number: pendingUser.roll_number,
      location: pendingUser.location,
      role: pendingUser.role,
      points: 0,
    });

    // Delete pending record
    await pendingUser.destroy();

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});


/**
 * GET /api/auth/leaderboard
 * Public or Authenticated
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "points"],
      order: [["points", "DESC"]],
      limit: 10,
    });

    // Mask emails for privacy
    const leaderboard = users.map(u => ({
      id: u.id,
      points: u.points,
      name: u.email.split("@")[0] // Simple name masking
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

/**
 * GET /api/auth/users
 * Admin only - Fetch all users
 */
/**
 * GET /api/auth/users
 * Admin only - Fetch all users
 */
const { authorize } = require("../middleware/authMiddleware");

router.get("/users", authenticate, authorize("admin"), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Admin only - Delete a user
 */
router.delete("/users/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    // Find ALL users with this email (Student & Donor)
    const users = await User.findAll({ where: { email } });
    if (!users || users.length === 0) return res.status(404).json({ message: "User not found" });

    // Generate specific OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 600000; // 10 minutes

    // Update ALL users
    for (const user of users) {
      user.resetPasswordToken = otp;
      user.resetPasswordExpires = expires;
      await user.save();
    }

    // Send Email
    // Used global transporter instance

    // NOTE: In a real scenario, use environment variables for credentials.
    // Since I cannot set env vars easily here, and the user user asked for "email OTP", 
    // I will mock the email sending if credentials aren't set, or Log it.

    // For this specific environment, I'll log the OTP to console so the user can see it for testing
    // and attempt to send if configured.
    console.log(`[OTP] Password reset OTP for ${email}: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
            <div style="text-align: center; padding-bottom: 20px;">
              <h1 style="color: #333; margin: 0;">CampusFood</h1>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #444; margin-top: 0;">Password Reset</h2>
              <p style="color: #666; line-height: 1.6;">Hello,</p>
              <p style="color: #666; line-height: 1.6;">You requested a password reset for your CampusFood account. Use the verification code below to proceed:</p>
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
        `
    };

    // Attempt to send email but don't crash if it fails (dev mode fallback)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent to email" });
      } else {
        res.json({ message: "OTP generated (Check console - Creds missing)" });
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      res.status(200).json({ message: "OTP generated (Check console if email failed)" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

/**
 * POST /api/auth/verify-otp
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      where: {
        email,
        resetPasswordToken: otp
      }
    });

    if (!user) return res.status(400).json({ message: "Invalid OTP" });

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const users = await User.findAll({
      where: {
        email,
        resetPasswordToken: otp,
        // Check for expiry
        // resetPasswordExpires: { [Op.gt]: Date.now() } // Need Op from sequelize
      }
    });

    if (!users || users.length === 0) return res.status(400).json({ message: "Invalid or expired OTP" });

    // Check expiry on the first found user (they should be same)
    if (users[0].resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update ALL users
    for (const user of users) {
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    }

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resetting password" });
  }
});


module.exports = router;
