const express = require("express");
const router = express.Router();
const { getSmartPatients, getSmartTreatments } = require("./smartHistory.service");
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { cache } = require("../middlewares/cacheMiddleware");

// All smart-history routes require authentication and doctor privileges
router.use(protect);
router.use(requireRole("doctor"));

// GET /api/smart-history/patients?disease=Eczema (cached 10 min per disease)
router.get("/patients", cache("smart_history_patients", 600), async (req, res) => {
  const doctorId = req.user.id;
  const disease = req.query.disease;

  if (!disease) {
    return res.status(400).json({
      success: false,
      error: "Query parameter 'disease' is required."
    });
  }

  try {
    const patients = await getSmartPatients(doctorId, disease);
    return res.status(200).json(patients);
  } catch (err) {
    console.error("Error in GET /smart-history/patients:", err.message);
    return res.status(500).json({
      success: false,
      error: "An internal database error occurred while fetching patients."
    });
  }
});

// GET /api/smart-history/treatments?disease=Eczema (cached 10 min per disease)
router.get("/treatments", cache("smart_history_treatments", 600), async (req, res) => {
  const doctorId = req.user.id;
  const disease = req.query.disease;

  if (!disease) {
    return res.status(400).json({
      success: false,
      error: "Query parameter 'disease' is required."
    });
  }

  try {
    const treatments = await getSmartTreatments(doctorId, disease);
    return res.status(200).json(treatments);
  } catch (err) {
    console.error("Error in GET /smart-history/treatments:", err.message);
    return res.status(500).json({
      success: false,
      error: "An internal database error occurred while fetching treatments."
    });
  }
});

module.exports = router;
