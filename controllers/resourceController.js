const ClinicalMedication = require("../models/ClinicalMedication");
const ClinicalDisease = require("../models/ClinicalDisease");

/**
 * GET /api/resources/medications
 * Public endpoint to fetch medications library
 */
exports.getMedications = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const medications = await ClinicalMedication.find(query).sort({ name: 1 });
    res.json(medications);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/diseases
 * Public endpoint to fetch skin diseases encyclopedia
 */
exports.getDiseases = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ]
      };
    }

    const diseases = await ClinicalDisease.find(query).sort({ name: 1 });
    res.json(diseases);
  } catch (error) {
    next(error);
  }
};
