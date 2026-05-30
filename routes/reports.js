const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const reportController = require("../controllers/reportController");

// Get a specific patient's report (Usually for Doctor)
router.get("/reports/patient/:patientId", protect, reportController.getPatientReport);

// Get my own report (For Patient App)
router.get("/reports/my-report", protect, reportController.getMyReport);

// Send the patient report via WhatsApp (For Doctor)
router.post("/reports/send/:patientId", protect, reportController.sendPatientReportWhatsApp);

module.exports = router;
