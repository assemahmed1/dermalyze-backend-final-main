require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { connectDB, sequelize } = require("./config/db");

// Import all models + associations (must come before sync)
require("./models");

const analysisRoutes = require("./routes/analysisRoutes");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const medicationRoutes = require("./routes/medicationRoutes");
const historyRoutes = require("./routes/historyRoutes");
const verifyRoutes = require("./routes/verifyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const userRoutes = require("./routes/userRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const medicinesRouter = require("./routes/medicines");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const smartHistoryRoutes = require("./routes/smartHistory");
const diseaseReportRoutes = require("./routes/diseaseReport.routes");
const standardRoutes = require("./routes/standardRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { loadModels } = require("./services/faceService");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./services/socketHandler");
const helmet = require("helmet");
const crypto = require("crypto");

const app = express();

app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});

socketHandler(io);

app.use(helmet());
app.use(cookieParser());
app.use(morgan("dev"));

// ── X-Request-ID — add unique ID to every request for tracing ────────────────
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

// ── Request Timeout — 30s default, 120s for analysis routes ──────────────────
app.use((req, res, next) => {
  const isAnalysisRoute = req.path.includes("/analysis/");
  const timeoutMs = isAnalysisRoute ? 120000 : 30000;
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
  res.on("close", () => clearTimeout(timeout));
  next();
});
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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

(async () => {
  await connectDB();
  await sequelize.sync();
  console.log("✅ MySQL tables synced successfully.");

  // Reset stale online statuses from any previous server crash
  const User = require("./models/User");
  await User.update({ isOnline: false }, { where: { isOnline: true } });
  console.log("🔄 Reset stale online statuses.");
})();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/auth", verifyRoutes);
app.use("/api/user", userRoutes);
app.use("/api", protectedRoutes);
app.use("/api", doctorRoutes);
app.use("/api", analysisRoutes);
app.use("/api", patientRoutes);
app.use("/api", medicationRoutes);
app.use("/api", historyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api", medicinesRouter);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", diseaseReportRoutes);
app.use("/api/smart-history", smartHistoryRoutes);
app.use("/api", standardRoutes);

app.get('/api/resources/medications', (req, res) => {
  res.redirect(307, '/api/medicines/all');
});

app.get("/", (req, res) => {
  res.send("Dermalyze Backend Running ✅");
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5050;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  await loadModels();
});