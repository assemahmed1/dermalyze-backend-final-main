const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const {
  addMedication,
  getPatientMedications,
  updateMedication,
  deleteMedication,
} = require("../controllers/medicationController");

/**
 * @swagger
 * /patient/{patientId}/medications:
 *   post:
 *     summary: Add medication to patient
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Methotrexate
 *               dosage:
 *                 type: string
 *                 example: 7.5mg
 *               frequency:
 *                 type: string
 *                 example: Once weekly
 *               notes:
 *                 type: string
 */
router.post("/patient/:patientId/medications", auth, requireRole("doctor"), addMedication);

/**
 * @swagger
 * /patient/{patientId}/medications:
 *   get:
 *     summary: Get all medications for a patient
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/patient/:patientId/medications", auth, requireRole("doctor", "patient"), getPatientMedications);

/**
 * @swagger
 * /medications/{id}:
 *   put:
 *     summary: Update medication
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put("/medications/:id", auth, requireRole("doctor"), updateMedication);

/**
 * @swagger
 * /medications/{id}:
 *   delete:
 *     summary: Delete medication
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete("/medications/:id", auth, requireRole("doctor"), deleteMedication);

module.exports = router;
