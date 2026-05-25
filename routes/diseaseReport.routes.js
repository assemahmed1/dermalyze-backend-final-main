const express = require("express");
const router = express.Router();
const { getDiseaseReport } = require("./diseaseReport.service");
const protect = require("../middlewares/authMiddleware");
const { cache } = require("../middlewares/cacheMiddleware");

router.get("/disease-report", protect, cache("disease_report", 86400), async (req, res) => {
  const { disease } = req.query;

  if (!disease) {
    return res.status(400).json({
      success: false,
      error: "Query parameter 'disease' is required. Example: /api/disease-report?disease=Eczema"
    });
  }

  try {
    const report = await getDiseaseReport(disease);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: `Disease report for '${disease}' not found.`
      });
    }

    return res.status(200).json(report);
  } catch (err) {
    console.error("Error in GET /disease-report:", err.message);
    return res.status(500).json({
      success: false,
      error: "An internal database error occurred while fetching the disease report."
    });
  }
});

module.exports = router;
