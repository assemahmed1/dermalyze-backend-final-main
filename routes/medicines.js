const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const ClinicalMedication = require("../models/ClinicalMedication");
const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const { cache } = require("../middlewares/cacheMiddleware");

// Helper to map DB record to the expected output format
const mapMedication = (med) => {
  let activeIngredient = "N/A";
  if (med.description && med.description.includes("Active Ingredient:")) {
    activeIngredient = med.description
      .replace("Active Ingredient:", "")
      .replace(/\./g, "")
      .trim();
  }
  return {
    name: med.name || "N/A",
    activeIngredient,
    category: med.category || "N/A",
  };
};

/**
 * @swagger
 * /medicines/search:
 *   get:
 *     summary: Search medicines by name or generic name
 *     tags: [Medicines]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/medicines/search", cache("medicines_search", 300), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const query = q.trim();

    const results = await ClinicalMedication.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { category: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 20
    });

    const mappedResults = results.map(mapMedication);

    res.json({ success: true, total: mappedResults.length, results: mappedResults });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @swagger
 * /medicines/match:
 *   get:
 *     summary: Exact match medicines by name or generic name
 *     tags: [Medicines]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/medicines/match", cache("medicines_match", 300), async (req, res) => {
  try {
    const qVal = req.query.q || req.query.name;
    if (!qVal) {
      return res.status(400).json({ message: "Search query ('q' or 'name') is required" });
    }

    const query = qVal.trim();

    const results = await ClinicalMedication.findAll({
      where: {
        [Op.or]: [
          { name: query },
          { description: { [Op.like]: `%Active Ingredient: ${query}%` } }
        ]
      }
    });

    const mappedResults = results.map(mapMedication);

    res.json({ success: true, total: mappedResults.length, results: mappedResults });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @swagger
 * /medicines/all:
 *   get:
 *     summary: Get all medicines from the guide
 *     tags: [Medicines]
 */
router.get("/medicines/all", cache("medicines_all", 3600), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;

    const { count, rows } = await ClinicalMedication.findAndCountAll({
      offset: startIndex,
      limit: limit,
      order: [["name", "ASC"]]
    });

    const paginatedData = rows.map(mapMedication);

    res.json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: paginatedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;