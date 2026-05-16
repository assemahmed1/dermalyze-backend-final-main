const express = require("express");
const router = express.Router();

const { createAnalysis, getPatientAnalyses } = require("../controllers/analysisController");
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const requireVerifiedDoctor = require("../middlewares/verificationMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

/**
 * @swagger
 * /analysis/{patientId}:
 *   post:
 *     summary: Upload image and analyze with AI
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Analysis created successfully
 */
router.post("/analysis/:patientId", protect, requireRole("doctor"), requireVerifiedDoctor, validateObjectId("patientId"), upload.single("image"), createAnalysis);

/**
 * @swagger
 * /patient/{patientId}/analyses:
 *   get:
 *     summary: Get patient analyses
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of analyses
 */
router.get("/patient/:patientId/analyses", protect, requireRole("doctor", "patient"), requireVerifiedDoctor, validateObjectId("patientId"), getPatientAnalyses);

module.exports = router;