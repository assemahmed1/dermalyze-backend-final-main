require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/db");

const analysisRoutes = require("./routes/analysisRoutes");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const medicationRoutes = require("./routes/medicationRoutes");
const historyRoutes = require("./routes/historyRoutes");
const verifyRoutes = require("./routes/verifyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { loadModels } = require("./services/faceService");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./services/socketHandler");

// Security related dependencies
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

const app = express();

// 🔍 Aggressive Fix: Make req.query writable (Express 5 compatibility)
// This MUST be the very first middleware to shadow the inherited read-only getter.
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

// Initialize Socket Handler
socketHandler(io);

// 1) Set security HTTP headers
app.use(helmet());

// 2) Enable CORS (restricted in production)
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*"
}));

// 3) Body parser, reading data into req.body with size limit (e.g., 10kb)
app.use(express.json({ limit: "10kb" })); 

// 4) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6) Prevent parameter pollution (Modern Node.js 22/Express 5 compatible)
app.use((req, res, next) => {
  if (req.query) {
    const sanitized = {};
    Object.keys(req.query).forEach(key => {
      const val = req.query[key];
      sanitized[key] = Array.isArray(val) ? val[val.length - 1] : val;
    });
    // Now safe because we made req.query writable above
    Object.assign(req.query, sanitized);
  }
  next();
});

connectDB();

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", verifyRoutes);
app.use("/api", protectedRoutes);
app.use("/api", doctorRoutes);
app.use("/api", analysisRoutes);
app.use("/api", patientRoutes);
app.use("/api", medicationRoutes);
app.use("/api", historyRoutes);
app.use("/api/chat", chatRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Dermalyze Backend Running ✅");
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler — must be last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  await loadModels();
});