require("dotenv").config();
const express = require("express");
const cors = require("cors");
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
const errorHandler = require("./middlewares/errorHandler");
const { loadModels } = require("./services/faceService");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./services/socketHandler");
const helmet = require("helmet");

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
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*"
}));
app.use(express.json({ limit: "10kb" }));

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
  await sequelize.sync({ alter: true });
  console.log("✅ MySQL tables synced successfully.");
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
app.use("/smart-history", smartHistoryRoutes);

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