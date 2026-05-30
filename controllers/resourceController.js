const { Op } = require("sequelize");
const ClinicalMedication = require("../models/ClinicalMedication");
const Disease = require("../models/Disease");

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
        { generalInfo: { [Op.like]: `%${search}%` } },
      ];
    }
    const diseases = await Disease.findAll({ where, order: [["name", "ASC"]] });
    
    // Map generalInfo to description for frontend compatibility
    const formatted = diseases.map(d => {
      const plain = d.get({ plain: true });
      
      const parseIfString = (val) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch(e) { return []; }
        }
        return val || [];
      };

      return {
        ...plain,
        description: plain.generalInfo,
        symptoms: parseIfString(plain.symptoms),
        treatments: parseIfString(plain.treatments),
        visualPatterns: parseIfString(plain.visualPatterns)
      };
    });
    
    res.json(formatted);
  } catch (error) { next(error); }
};
