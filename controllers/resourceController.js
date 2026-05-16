const { Op } = require("sequelize");
const ClinicalMedication = require("../models/ClinicalMedication");
const ClinicalDisease = require("../models/ClinicalDisease");

/**
 * GET /api/resources/medications
 */
exports.getMedications = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    const medications = await ClinicalMedication.findAll({ where, order: [["name", "ASC"]] });
    res.json(medications);
  } catch (error) { next(error); }
};

/**
 * GET /api/resources/diseases
 */
exports.getDiseases = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    const diseases = await ClinicalDisease.findAll({ where, order: [["name", "ASC"]] });
    res.json(diseases);
  } catch (error) { next(error); }
};
