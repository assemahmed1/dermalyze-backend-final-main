const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const reportController = require("../controllers/reportController");

// Get a patient report
router.get("/reports/patient/:patientId", protect, reportController.getPatientReport);

// Send the patient report via WhatsApp
router.post("/reports/send/:patientId", protect, reportController.sendPatientReportWhatsApp);

module.exports = router;
