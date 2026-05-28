const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const requireVerifiedDoctor = require("../middlewares/verificationMiddleware");
const ClinicalMedication = require("../models/ClinicalMedication");
const {
  addMedication,
  getPatientMedications,
  updateMedication,
  deleteMedication,
  getMyMedications,
} = require("../controllers/medicationController");

/**
 * @swagger
 * /medications/search:
 *   get:
 *     summary: Search medications by name (autocomplete for doctor prescription dropdown)
 *     tags: [Medications]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of matching medications (max 10)
 */
router.get("/medications/search", auth, requireRole("doctor"), async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ success: true, data: [] });

    const medications = await ClinicalMedication.findAll({
      where: { name: { [Op.like]: `%${q}%` } },
      attributes: ["id", "name", "category", "dosage"],
      limit: 10,
      order: [["name", "ASC"]],
    });

    res.json({ success: true, data: medications });
  } catch (error) {
    next(error);
  }
});


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
router.post("/patient/:patientId/medications", auth, requireRole("doctor"), requireVerifiedDoctor, addMedication);
router.post("/patients/:patientId/medications", auth, requireRole("doctor"), requireVerifiedDoctor, addMedication);

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
router.get("/patients/:patientId/medications", auth, requireRole("doctor", "patient"), getPatientMedications);

/**
 * @swagger
 * /patient/my/medications:
 *   get:
 *     summary: Get my medications (for patient)
 *     tags: [Medications]
 */
router.get("/patient/my/medications", auth, requireRole("patient"), getMyMedications);
router.get("/patient/my-medications", auth, requireRole("patient"), getMyMedications);

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
router.put("/medications/:id", auth, requireRole("doctor"), requireVerifiedDoctor, updateMedication);

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
router.delete("/medications/:id", auth, requireRole("doctor"), requireVerifiedDoctor, deleteMedication);

module.exports = router;
