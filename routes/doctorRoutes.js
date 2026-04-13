const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const doctorController = require("../controllers/doctorController");

/**
 * @swagger
 * /link-doctor:
 *   post:
 *     summary: Link patient to doctor using doctor code
 *     tags: [Doctor]
 */
router.post("/link-doctor", auth, requireRole("patient"), doctorController.linkDoctor);

/**
 * @swagger
 * /doctor/patients:
 *   get:
 *     summary: Get all patients of the doctor
 *     tags: [Doctor]
 */
router.get("/doctor/patients", auth, requireRole("doctor"), doctorController.getPatients);

/**
 * @swagger
 * /doctor/patient/{id}/analyses:
 *   get:
 *     summary: Get analyses of a specific patient
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/doctor/patient/:id/analyses", auth, requireRole("doctor"), doctorController.getPatientAnalyses);

/**
 * @swagger
 * /doctor/stats:
 *   get:
 *     summary: Get doctor dashboard statistics
 *     tags: [Doctor]
 *     responses:
 *       200:
 *         description: Total patients, critical cases, active today
 */
router.get("/doctor/stats", auth, requireRole("doctor"), doctorController.getDoctorStats);

module.exports = router;