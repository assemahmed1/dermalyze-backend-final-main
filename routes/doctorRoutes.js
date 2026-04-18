const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const doctorController = require("../controllers/doctorController");
const validateObjectId = require("../middlewares/validateObjectId");
const { reviewRules, validate } = require("../middlewares/validationMiddleware");

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

/**
 * @swagger
 * /doctor/notifications/test:
 *   post:
 *     summary: Create a test notification for the logged-in doctor
 *     tags: [Doctor]
 *     responses:
 *       201:
 *         description: Created notification object
 */
router.post("/doctor/notifications/test", auth, requireRole("doctor"), doctorController.testNotification);

/**
 * @swagger
 * /doctor/patients/{patientId}/review:
 *   post:
 *     summary: Add a review/note for a patient
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - review
 *             properties:
 *               review:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Review added successfully
 */
router.post(
  "/doctor/patients/:patientId/review",
  auth,
  requireRole("doctor"),
  validateObjectId("patientId"),
  reviewRules,
  validate,
  doctorController.addReview
);

/**
 * @swagger
 * /doctor/patients/{patientId}/reviews:
 *   get:
 *     summary: Get all reviews for a patient
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get(
  "/doctor/patients/:patientId/reviews",
  auth,
  requireRole("doctor"),
  validateObjectId("patientId"),
  doctorController.getReviews
);

module.exports = router;