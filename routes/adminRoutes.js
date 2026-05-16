const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const adminController = require("../controllers/adminController");
const validateObjectId = require("../middlewares/validateObjectId");

/**
 * @swagger
 * /admin/verify-doctor/{userId}:
 *   post:
 *     summary: Approve or reject a doctor's ID card verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The doctor's user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [verified, rejected]
 *                 example: verified
 *               note:
 *                 type: string
 *                 description: Optional rejection reason
 *                 example: "ID card image is blurry, please re-upload"
 *     responses:
 *       200:
 *         description: Doctor verification status updated
 *       400:
 *         description: Invalid status or user is not a doctor
 *       404:
 *         description: User not found
 */
router.post(
  "/verify-doctor/:userId",
  auth,
  requireRole("admin"),
  validateObjectId("userId"),
  adminController.verifyDoctor
);

/**
 * @swagger
 * /admin/doctors/pending:
 *   get:
 *     summary: List all doctors pending verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending doctors
 */
router.get(
  "/doctors/pending",
  auth,
  requireRole("admin"),
  adminController.getPendingDoctors
);

/**
 * @swagger
 * /admin/doctors:
 *   get:
 *     summary: List all doctors with verification status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all doctors
 */
router.get(
  "/doctors",
  auth,
  requireRole("admin"),
  adminController.getAllDoctors
);

module.exports = router;
