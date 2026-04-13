const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { getSmartHistory } = require("../controllers/historyController");

/**
 * @swagger
 * /doctor/history:
 *   get:
 *     summary: Get AI-powered treatment insights by disease
 *     tags: [Doctor]
 *     parameters:
 *       - in: query
 *         name: disease
 *         required: true
 *         schema:
 *           type: string
 *         example: Psoriasis
 *     responses:
 *       200:
 *         description: Best performing drugs and patient outcomes
 */
router.get("/doctor/history", auth, requireRole("doctor"), getSmartHistory);

module.exports = router;
