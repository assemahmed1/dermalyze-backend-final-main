const express = require("express");
const router = express.Router();
const { register, login, refresh, logout, activateAccount } = require("../controllers/authController");
const { registerRules, loginRules, validate } = require("../middlewares/validationMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many login/registration attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user (doctors must upload ID card front, back, and selfie)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Assem
 *               email:
 *                 type: string
 *                 example: assem@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *               role:
 *                 type: string
 *                 enum: [doctor, patient]
 *                 example: doctor
 *               doctorCode:
 *                 type: string
 *                 description: "Required if role is patient. Get this code from your doctor."
 *                 example: DOC-ABC123
 *               idCardFront:
 *                 type: string
 *                 format: binary
 *                 description: "Required if role is doctor. Front of official medical ID card."
 *               idCardBack:
 *                 type: string
 *                 format: binary
 *                 description: "Required if role is doctor. Back of official medical ID card."
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: "Required if role is doctor. Selfie photo of the doctor."
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Invalid data or missing/wrong doctor code
 */
router.post(
  "/register",
  authLimiter,
  upload.fields([
    { name: "idCardFront", maxCount: 1 },
    { name: "idCardBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 }
  ]),
  registerRules,
  validate,
  register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: assem@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid data
 */
router.post("/login", authLimiter, loginRules, validate, login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Auth]
 */
router.post("/refresh", refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post("/logout", logout);

/**
 * @swagger
 * /auth/activate:
 *   post:
 *     summary: Activate patient account via magic link token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT magic link token received via WhatsApp
 *               password:
 *                 type: string
 *                 description: New password the patient wants to set
 *                 example: "MyNew@Password1"
 *     responses:
 *       200:
 *         description: Account activated — returns access token and user data
 *       400:
 *         description: Invalid or expired token, or account already active
 *       404:
 *         description: User not found
 */
router.post("/activate", activateAccount);

module.exports = router;