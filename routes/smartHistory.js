const express = require("express");
const router = express.Router();
const { getSmartPatients, getSmartTreatments } = require("./smartHistory.service");

// GET /api/smart-history/patients?doctor_id=1&disease=Eczema
router.get("/patients", async (req, res) => {
  const doctorId = req.query.doctor_id;
  const disease = req.query.disease;

  if (!doctorId || !disease) {
    return res.status(400).json({
      success: false,
      error: "Query parameters 'doctor_id' and 'disease' are required."
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

// GET /api/smart-history/treatments?doctor_id=1&disease=Eczema
router.get("/treatments", async (req, res) => {
  const doctorId = req.query.doctor_id;
  const disease = req.query.disease;

  if (!doctorId || !disease) {
    return res.status(400).json({
      success: false,
      error: "Query parameters 'doctor_id' and 'disease' are required."
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
