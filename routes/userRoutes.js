const express = require("express");
const router = express.Router();
const { forgotPassword, verifyOTP, resetPassword } = require("../controllers/authController");
const { 
  validate, 
  forgotPasswordRules, 
  verifyOTPRules, 
  resetPasswordRules 
} = require("../middlewares/validationMiddleware");

/**
 * @swagger
 * /user/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: assem@test.com
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: User not found
 */
router.post("/forgot-password", forgotPasswordRules, validate, forgotPassword);

/**
 * @swagger
 * /user/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify-otp", verifyOTPRules, validate, verifyOTP);

/**
 * @swagger
 * /user/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/reset-password", resetPasswordRules, validate, resetPassword);

module.exports = router;
