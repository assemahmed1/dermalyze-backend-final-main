require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { connectDB, sequelize } = require("./config/db");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");

// Import all models + associations (must come before sync)
require("./models");

// ── Routes ──────────────────────────────────────────────────────────────────
const analysisRoutes    = require("./routes/analysisRoutes");
const authRoutes        = require("./routes/authRoutes");
const protectedRoutes   = require("./routes/protectedRoutes");
const doctorRoutes      = require("./routes/doctorRoutes");
const patientRoutes     = require("./routes/patientRoutes");
const medicationRoutes  = require("./routes/medicationRoutes");
const historyRoutes     = require("./routes/historyRoutes");
const verifyRoutes      = require("./routes/verifyRoutes");
const chatRoutes        = require("./routes/chatRoutes");
const userRoutes        = require("./routes/userRoutes");
const resourceRoutes    = require("./routes/resourceRoutes");
const medicinesRouter   = require("./routes/medicines");
const aiRoutes          = require("./routes/aiRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const smartHistoryRoutes   = require("./routes/smartHistory");
const diseaseReportRoutes  = require("./routes/diseaseReport.routes");
const reportsRoutes     = require("./routes/reports");
const diseaseRoutes        = require("./routes/diseaseRoutes");
const standardRoutes    = require("./routes/standardRoutes");
const errorHandler      = require("./middlewares/errorHandler");
const socketHandler     = require("./services/socketHandler");

const app = express();

// Trust the first proxy to ensure express-rate-limit gets the correct client IP
app.set("trust proxy", 1);

// ── HTTP + Socket.io Server ──────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});
socketHandler(io);

// ── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet());

// ── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Request Logger ───────────────────────────────────────────────────────────
app.use(morgan("dev"));

// ── X-Request-ID — unique trace ID for every request ────────────────────────
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

// ── Request Timeout (30s default, 120s for AI analysis routes) ───────────────
app.use((req, res, next) => {
  const isLongRoute = req.path.includes("/analysis/") || req.path.includes("/auth/register");
  const timeoutMs = isLongRoute ? 120000 : 30000;
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Request timed out. Please try again.",
        requestId: req.requestId,
      });
    }
  }, timeoutMs);
  res.on("finish", () => clearTimeout(timeout));
  res.on("close",  () => clearTimeout(timeout));
  next();
});

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://admin-panel-three-blue-97.vercel.app"
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ── HTTP Parameter Pollution Protection ──────────────────────────────────────
// Flatten duplicate query params to prevent pollution attacks
app.use((req, res, next) => {
  if (req.query) {
    const sanitized = {};
    Object.keys(req.query).forEach(key => {
      const val = req.query[key];
      sanitized[key] = Array.isArray(val) ? val[val.length - 1] : val;
    });
    Object.assign(req.query, sanitized);
  }
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Login: 10 attempts / 15 min per IP (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes before trying again."
  }
});

// Registration: 5 attempts / hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts from this IP. Please try again later."
  }
});

// General API: 200 requests / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down."
  }
});

app.use("/api/", generalLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

// ── Database Init ─────────────────────────────────────────────────────────────
(async () => {
  await connectDB();
  await sequelize.sync({ alter: false });

  console.log("✅ MySQL tables synced successfully.");

  const User = require("./models/User");
  await User.update({ isOnline: false }, { where: { isOnline: true } });
  console.log("🔄 Reset stale online statuses.");
})();

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {}
  };

  // Check DB
  try {
    await sequelize.authenticate();
    health.services.database = "connected";
  } catch {
    health.services.database = "disconnected";
    health.status = "degraded";
  }

  // Check Redis
  try {
    const { Redis } = require("@upstash/redis");
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      health.services.cache = "connected";
    } else {
      health.services.cache = "not_configured";
    }
  } catch {
    health.services.cache = "disconnected";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return res.status(statusCode).json(health);
});

// ── Swagger Docs ──────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/auth",          verifyRoutes);
app.use("/api/user",          userRoutes);
app.use("/api",               protectedRoutes);
app.use("/api",               doctorRoutes);
app.use("/api",               analysisRoutes);
app.use("/api",               patientRoutes);
app.use("/api",               medicationRoutes);
app.use("/api",               historyRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/resources",     resourceRoutes);
app.use("/api",               medicinesRouter);
app.use("/api/ai",            aiRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api",               diseaseReportRoutes);
app.use("/api",               reportsRoutes);
app.use("/api/diseases",      diseaseRoutes);
app.use("/api/smart-history", smartHistoryRoutes);
app.use("/api",               standardRoutes);

// Redirect old medications route to new medicines endpoint
app.get("/api/resources/medications", (req, res) => {
  res.redirect(307, "/api/medicines/all");
});

// Root
app.get("/", (req, res) => {
  res.json({
    name: "Dermalyze API",
    status: "running",
    version: "2.0.0",
    docs: `${req.protocol}://${req.get("host")}/api-docs`,
    health: `${req.protocol}://${req.get("host")}/health`,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestId: req.requestId,
  });
});

// Global Error Handler
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`🚀 Dermalyze server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// When Railway (or any host) sends SIGTERM, finish current requests then shut down
const shutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received — starting graceful shutdown...`);
  server.close(async () => {
    console.log("✅ HTTP server closed. No new requests accepted.");
    try {
      await sequelize.close();
      console.log("✅ Database connection closed.");
    } catch (err) {
      console.error("❌ Error closing DB:", err.message);
    }
    console.log("👋 Goodbye!");
    process.exit(0);
  });

  // Force exit after 15 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("❌ Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 15000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// Catch unhandled promise rejections (prevent server crash)
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Promise Rejection:", reason);
});