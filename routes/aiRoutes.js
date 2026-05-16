const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");

// ── Multer: save uploads to the uploads/ folder ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ── POST /ai/improvement ──────────────────────────────────────────────────────
/**
 * @swagger
 * /ai/improvement:
 *   post:
 *     summary: Compare skin severity between two visit images
 *     tags: [AI]
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
 *       500:
 *         description: Inference error
 */
router.post(
  "/improvement",
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

    const image1Path = files.visit1[0].path;
    const image2Path = files.visit2[0].path;
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
      console.error("[spawn error]", err);
      return res
        .status(500)
        .json({ error: "Failed to start Python process.", details: err.message });
    });
  }
);

module.exports = router;
