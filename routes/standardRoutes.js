const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const requireVerifiedDoctor = require("../middlewares/verificationMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const { getOrCreatePatient } = require("../utils/patientUtils");
const Medication = require("../models/Medication");
const Analysis = require("../models/Analysis");

const {
  updatePatientStatus,
  updateRecoveryProgress,
} = require("../controllers/patientController");

const {
  addMedication,
  getPatientMedications,
} = require("../controllers/medicationController");

const {
  createAnalysis,
} = require("../controllers/analysisController");

// Helper middleware to map route parameters dynamically
const mapParams = (from, to) => {
  return (req, res, next) => {
    if (req.params[from] !== undefined) {
      req.params[to] = req.params[from];
    }
    next();
  };
};

// ----------------------------------------------------
// PATIENT'S OWN ROUTES (Me prefix)
// ----------------------------------------------------

// GET /api/patients/me/medications
router.get("/patients/me/medications", protect, requireRole("patient"), async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const patient = await getOrCreatePatient(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    const medications = await Medication.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]]
    });
    res.json({ success: true, data: medications });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/analysis
router.get("/patients/me/analysis", protect, requireRole("patient"), async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const analyses = await Analysis.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]]
    });
    res.json({ success: true, data: analyses });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// DOCTOR'S ROUTES (Acting on a Patient)
// ----------------------------------------------------

// PUT /api/doctors/patients/:id/status
router.put(
  "/doctors/patients/:id/status",
  protect,
  requireRole("doctor"),
  requireVerifiedDoctor,
  validateObjectId("id"),
  async (req, res, next) => {
    // Wrap to standardize response envelope
    const originalJson = res.json;
    res.json = function(data) {
      return originalJson.call(this, { success: true, message: "Patient status updated", data });
    };
    return updatePatientStatus(req, res, next);
  }
);

// PUT /api/doctors/patients/:id/recovery
router.put(
  "/doctors/doctors/patients/:id/recovery", // Alias support
  protect,
  requireRole("doctor"),
  requireVerifiedDoctor,
  validateObjectId("id"),
  updateRecoveryProgress
);
router.put(
  "/doctors/patients/:id/recovery",
  protect,
  requireRole("doctor"),
  requireVerifiedDoctor,
  validateObjectId("id"),
  async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      return originalJson.call(this, { success: true, message: "Recovery progress updated", data: data.patient || data });
    };
    return updateRecoveryProgress(req, res, next);
  }
);

// POST /api/doctors/patients/:patientId/medications
router.post(
  "/doctors/patients/:patientId/medications",
  protect,
  requireRole("doctor"),
  requireVerifiedDoctor,
  validateObjectId("patientId"),
  addMedication
);

// GET /api/doctors/patients/:patientId/medications
router.get(
  "/doctors/patients/:patientId/medications",
  protect,
  requireRole("doctor", "patient"),
  requireVerifiedDoctor,
  validateObjectId("patientId"),
  async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      return originalJson.call(this, { success: true, data });
    };
    return getPatientMedications(req, res, next);
  }
);

// POST /api/doctors/patients/:patientId/analysis (AI Scan)
router.post(
  "/doctors/patients/:patientId/analysis",
  protect,
  requireRole("doctor"),
  requireVerifiedDoctor,
  validateObjectId("patientId"),
  upload.single("image"),
  createAnalysis
);

// GET /api/doctors/patients/:patientId/analysis
router.get(
  "/doctors/patients/:patientId/analysis",
  protect,
  requireRole("doctor", "patient"),
  requireVerifiedDoctor,
  validateObjectId("patientId"),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const analyses = await Analysis.findAll({
        where: { patientId },
        order: [["createdAt", "DESC"]]
      });
      res.json({ success: true, data: analyses });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
