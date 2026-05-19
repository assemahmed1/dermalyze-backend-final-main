const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const rateLimit = require("express-rate-limit");
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

// Limit AI improvement scans to prevent CPU DoS
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each doctor to 5 scans per 5 minutes
  message: { error: "Too many AI analysis scans requested. Please wait 5 minutes." }
});

// ── Multer: use memory storage (safe for Railway ephemeral containers) ─────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});

// ── POST /ai/improvement ──────────────────────────────────────────────────────
/**
 * @swagger
 * /ai/improvement:
 *   post:
 *     summary: Compare skin severity between two visit images
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               visit1:
 *                 type: string
 *                 format: binary
 *               visit2:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Severity scores and improvement percentage
 *       400:
 *         description: Both images are required
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Inference error
 */
router.post(
  "/improvement",
  protect,
  requireRole("doctor"),
  aiLimiter,
  upload.fields([
    { name: "visit1", maxCount: 1 },
    { name: "visit2", maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files;

    if (!files || !files.visit1 || !files.visit2) {
      return res
        .status(400)
        .json({ error: "Both visit1 and visit2 images are required." });
    }

    // Write buffers to /tmp (safe across all environments including Railway)
    const image1Path = path.join(os.tmpdir(), `visit1_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
    const image2Path = path.join(os.tmpdir(), `visit2_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);

    // Helper to clean up temp files safely
    const cleanup = () => {
      try { if (fs.existsSync(image1Path)) fs.unlinkSync(image1Path); } catch (_) {}
      try { if (fs.existsSync(image2Path)) fs.unlinkSync(image2Path); } catch (_) {}
    };

    try {
      fs.writeFileSync(image1Path, files.visit1[0].buffer);
      fs.writeFileSync(image2Path, files.visit2[0].buffer);
    } catch (writeErr) {
      cleanup();
      return res.status(500).json({ error: "Failed to write temporary files.", details: writeErr.message });
    }

    const scriptPath = path.join(__dirname, "../scripts/inference.py");
    const py = spawn("python3", [scriptPath, image1Path, image2Path]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("close", (code) => {
      cleanup(); // Always clean up temp files on process close
      if (code !== 0) {
        console.error("[inference.py stderr]", stderr);
        return res.status(500).json({
          error: "Python inference failed.",
          details: stderr,
        });
      }

      // Expected output: "score1,score2,improvement"
      const parts = stdout.trim().split(",");
      if (parts.length !== 3) {
        return res
          .status(500)
          .json({ error: "Unexpected output from inference script.", raw: stdout });
      }

      const visit1_severity = parseFloat(parts[0]);
      const visit2_severity = parseFloat(parts[1]);
      const improvement_percentage = parseFloat(parts[2]);

      let status = "stable";
      if (improvement_percentage > 0) status = "improved";
      else if (improvement_percentage < 0) status = "worsened";

      return res.json({
        visit1_severity,
        visit2_severity,
        improvement_percentage,
        status,
      });
    });

    py.on("error", (err) => {
      cleanup(); // Clean up on spawn error too
      console.error("[spawn error]", err);
      return res
        .status(500)
        .json({ error: "Failed to start Python process.", details: err.message });
    });
  }
);

module.exports = router;
