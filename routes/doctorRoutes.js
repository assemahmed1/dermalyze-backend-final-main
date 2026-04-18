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

/**
 * @swagger
 * /doctor/notifications:
 *   get:
 *     summary: Get all notifications for the doctor
 *     tags: [Doctor]
 *     responses:
 *       200:
 *         description: Array of notification objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   title: { type: string }
 *                   body: { type: string }
 *                   type: { type: string, enum: [new_patient, analysis_done, appointment, system] }
 *                   isRead: { type: boolean }
 *                   createdAt: { type: string, format: date-time }
 */
router.get("/doctor/notifications", auth, requireRole("doctor"), doctorController.getNotifications);

/**
 * @swagger
 * /doctor/notifications/read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Doctor]
 *     responses:
 *       200:
 *         description: Success message
 */
router.put("/doctor/notifications/read", auth, requireRole("doctor"), doctorController.markNotificationsRead);

module.exports = router;