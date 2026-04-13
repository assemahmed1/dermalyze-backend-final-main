const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const { registerRules, loginRules, validate } = require("../middlewares/validationMiddleware");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Invalid data or missing/wrong doctor code
 */
router.post("/register", registerRules, validate, register);

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
router.post("/login", loginRules, validate, login);

module.exports = router;