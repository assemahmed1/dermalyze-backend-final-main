const express = require("express");
const router = express.Router();

const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatientStatus,
  updateRecoveryProgress,
} = require("../controllers/patientController");

const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { patientRules, validate } = require("../middlewares/validationMiddleware");

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Add new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, age, gender]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Ali
 *               age:
 *                 type: number
 *                 example: 25
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               diagnosis:
 *                 type: string
 *                 example: Psoriasis
 *               nationalId:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient added successfully
 */
router.post("/patients", protect, requireRole("doctor"), patientRules, validate, createPatient);

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: Get all doctor patients
 *     tags: [Patients]
 *     responses:
 *       200:
 *         description: List of patients
 */
router.get("/patients", protect, requireRole("doctor"), getPatients);

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient data
 */
router.get("/patients/:id", protect, requireRole("doctor"), getPatientById);

/**
 * @swagger
 * /patients/{id}/status:
 *   put:
 *     summary: Update patient status
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Improving, Stable, Critical]
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/patients/:id/status", protect, requireRole("doctor"), updatePatientStatus);

/**
 * @swagger
 * /patients/{id}/recovery:
 *   put:
 *     summary: Update recovery progress
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *                 example: 75
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/patients/:id/recovery", protect, requireRole("doctor"), updateRecoveryProgress);

module.exports = router;