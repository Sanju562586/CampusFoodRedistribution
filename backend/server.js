require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const foodRoutes = require("./routes/food");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors({
  origin: "*", // Temporarily allow all origins for debugging
  methods: ["GET", "POST", "PUT", "DELETE"],
  // credentials: true // Disabled for wildcard origin
}));


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(compression()); // Compress all payloads for high throughput

// Share io instance
app.use((req, res, next) => {
  req.io = io;
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

io.on("connection", (socket) => {
  console.log("Websocket connected:", socket.id);
});

const PORT = 5000;
const { sequelize } = require("./models");

// Sync database before starting server
sequelize.sync({ alter: true }).then(() => {
  console.log("✅ Database synced");
  server.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
  });
});
