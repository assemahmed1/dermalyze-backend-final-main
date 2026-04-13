const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyIdentity } = require("../controllers/verifyController");
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /auth/verify-identity:
 *   post:
 *     summary: Verify doctor identity using ID card and selfie
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               idFront:
 *                 type: string
 *                 format: binary
 *               idBack:
 *                 type: string
 *                 format: binary
 *               selfie:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Identity verified successfully
 *       400:
 *         description: Face does not match or not a doctor
 */
router.post(
  "/verify-identity",
  protect,
  requireRole("doctor"),
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  verifyIdentity
);

module.exports = router;
