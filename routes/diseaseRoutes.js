/**
 * routes/diseaseRoutes.js
 * Disease library endpoints — used by Flutter app for diagnosis autocomplete.
 */
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Disease = require("../models/Disease");
const protect = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * /diseases/search:
 *   get:
 *     summary: Search diseases by name (autocomplete for doctor diagnosis dropdown)
 *     tags: [Diseases]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial disease name to search
 *     responses:
 *       200:
 *         description: Array of matching diseases (max 10)
 */
router.get(
  "/search",
  protect,
  requireRole("doctor"),
  async (req, res, next) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q) {
        return res.json({ success: true, data: [] });
      }

      const diseases = await Disease.findAll({
        where: {
          name: { [Op.like]: `%${q}%` },
        },
        attributes: ["id", "name", "scientificName", "category", "severity"],
        limit: 10,
        order: [["name", "ASC"]],
      });

      res.json({ success: true, data: diseases });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /diseases/{id}:
 *   get:
 *     summary: Get full disease details by ID
 *     tags: [Diseases]
 */
router.get(
  "/:id",
  protect,
  requireRole("doctor"),
  async (req, res, next) => {
    try {
      const disease = await Disease.findByPk(req.params.id);
      if (!disease) {
        return res.status(404).json({ success: false, message: "Disease not found" });
      }
      res.json({ success: true, data: disease });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /diseases:
 *   get:
 *     summary: List all diseases (paginated)
 *     tags: [Diseases]
 */
router.get(
  "/",
  protect,
  requireRole("doctor"),
  async (req, res, next) => {
    try {
      const page  = parseInt(req.query.page)  || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const { rows: data, count } = await Disease.findAndCountAll({
        attributes: ["id", "name", "scientificName", "category", "severity"],
        limit,
        offset,
        order: [["name", "ASC"]],
      });

      res.json({ success: true, data, total: count, page, pages: Math.ceil(count / limit) });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
