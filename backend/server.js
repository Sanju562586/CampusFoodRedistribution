require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { Redis } = require("@upstash/redis");
const Pusher = require("pusher");

const authRoutes = require("./routes/auth");
const foodRoutes = require("./routes/food");

// ─────────────────────────────────────────────
// Startup Guard — fail loudly on missing secrets
// ─────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error(
    "❌ FATAL: JWT_SECRET env variable is not set.\n" +
    "   Generate one with: openssl rand -base64 64\n" +
    "   Then add it to Vercel environment variables."
  );
  if (process.env.NODE_ENV === "production") process.exit(1);
}

if (!process.env.QSTASH_TOKEN || process.env.QSTASH_TOKEN === "add_your_token_here") {
  console.warn(
    "⚠️  QSTASH_TOKEN is not set or is a placeholder.\n" +
    "   Food creates and reservations will fall back to synchronous DB writes.\n" +
    "   Get a real token from: https://console.upstash.com/qstash"
  );
}

const app = express();
const server = http.createServer(app);

// Shared Redis client — used by auth middleware + food routes only
const redis = Redis.fromEnv();

// ─────────────────────────────────────────────
// Pusher — Real-time events
// ─────────────────────────────────────────────
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

// ─────────────────────────────────────────────
// CORS — specific trusted origins only
// (wildcard is insecure and disables credentials)
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      // Add your production Vercel frontend URL here:
      // "https://campus-food-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(compression()); // Gzip all responses


// ─────────────────────────────────────────────
// ⚡ In-Memory Rate Limiter (per worker process)
//
// WHY NOT Redis-backed rate limiting?
// Upstash Redis is a REST API — each rate limit check adds 20-100ms of
// HTTP overhead on EVERY request. Under 5k concurrent connections that
// is the single biggest latency bottleneck. Pure in-memory limiting is
// instantaneous (<0.01ms) with no network calls.
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1-minute window
  max: 2000,           // 2,000 req/min per IP per worker
  message: { message: "Too many requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,     // suppress ERR_ERL_KEY_GEN_IPV6 warning
  keyGenerator: (req) =>
    "rl_" +
    (req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown")
      .toString()
      .split(",")[0]
      .trim()
      .replace(/:/g, "_"),
});
app.use(globalLimiter);


// ─────────────────────────────────────────────
// Share Pusher instance across all route handlers
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  req.pusher = pusher;
  next();
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/reservation", require("./routes/reservation"));
app.use("/api/ai", require("./routes/ai"));

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message || err);
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON format" });
  }
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
const { sequelize } = require("./models");

// Support local execution or Vercel serverless export
if (
  process.env.NODE_ENV !== "test" &&
  (require.main === module || process.env.CLUSTER_MODE === "true")
) {
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  if (process.env.CLUSTER_MODE === "true") {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Worker listening on port ${PORT}`);
    });
  } else {
    sequelize.sync({ alter: true }).then(() => {
      console.log("✅ Database synced");
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`✅ Backend running on http://localhost:${PORT}`);
      });
    });
  }
}

// Export for Vercel serverless
module.exports = app;