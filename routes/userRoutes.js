const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const protect = require("../middlewares/authMiddleware");
const { 
  validate, 
  forgotPasswordRules, 
  verifyOTPRules, 
  resetPasswordRules 
} = require("../middlewares/validationMiddleware");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile, settings, and security management
 */

// --- Authentication (Public) ---

router.post("/forgot-password", forgotPasswordRules, validate, authController.forgotPassword);
router.post("/verify-otp", verifyOTPRules, validate, authController.verifyOTP);
router.post("/reset-password", resetPasswordRules, validate, authController.resetPassword);

// --- Settings & Security (Protected) ---
router.use(protect); // All routes below require JWT auth

/**
 * @swagger
 * /user/notification-preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushNotifications: { type: boolean }
 *               emailNotifications: { type: boolean }
 *               smsNotifications: { type: boolean }
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put("/notification-preferences", userController.updateNotificationPreferences);

/**
 * @swagger
 * /user/2fa/enable:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     tags: [User]
 *     responses:
 *       200:
 *         description: 2FA secret generated. Return QR data URL.
 */
router.post("/2fa/enable", userController.enable2FA);

/**
 * @swagger
 * /user/2fa/verify:
 *   post:
 *     summary: Verify OTP code to activate 2FA
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 2FA activated
 */
router.post("/2fa/verify", userController.verify2FA);

/**
 * @swagger
 * /user/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     tags: [User]
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 */
router.post("/2fa/disable", userController.disable2FA);

/**
 * @swagger
 * /user/account:
 *   delete:
 *     summary: Permanently delete user account and all related clinical data
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete("/account", userController.deleteAccount);

module.exports = router;
