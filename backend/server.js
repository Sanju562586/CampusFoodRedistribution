require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
const Pusher = require("pusher");

const authRoutes = require("./routes/auth");
const foodRoutes = require("./routes/food");

const app = express();
const server = http.createServer(app);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.PUSHER_CLUSTER || "mt1",
  useTLS: true
});

app.use(cors({
  origin: "*", // Temporarily allow all origins for debugging
  methods: ["GET", "POST", "PUT", "DELETE"],
  // credentials: true // Disabled for wildcard origin
}));


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(compression()); // Compress all payloads for high throughput

// Share Pusher instance
app.use((req, res, next) => {
  req.pusher = pusher;
  next();
});



// app.post("/api/auth/google") removed

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/reservation", require("./routes/reservation"));
app.use("/api/ai", require("./routes/ai"));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err); // Log the error!
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: "Invalid JSON format" }); // Handle JSON parse errors
  }
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
const { sequelize } = require("./models");

// Support local execution or Vercel serverless export
if (process.env.NODE_ENV !== "test" && (require.main === module || process.env.CLUSTER_MODE === "true")) {
  if (process.env.CLUSTER_MODE === "true") {
    server.listen(PORT, () => {
      console.log(`✅ Worker listening on port ${PORT}`);
    });
  } else {
    // Sync database before starting local server
    sequelize.sync({ alter: true }).then(() => {
      console.log("✅ Database synced");
      server.listen(PORT, () => {
        console.log(`✅ Serverless Proxy backend running on http://localhost:${PORT}`);
      });
    });
  }
}

// Crucial: export the app strictly for Vercel's serverless environment
module.exports = app;
