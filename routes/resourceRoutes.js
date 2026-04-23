const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");

/**
 * @swagger
 * tags:
 *   name: Clinical Resources
 *   description: Public clinical library for medications and skin diseases
 */

/**
 * @swagger
 * /resources/medications:
 *   get:
 *     summary: Fetch medications guide/encyclopedia
 *     tags: [Clinical Resources]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by medication name
 *     responses:
 *       200:
 *         description: Array of medication resource objects
 */
// router.get("/medications", resourceController.getMedications);

/**
 * @swagger
 * /resources/diseases:
 *   get:
 *     summary: Fetch skin diseases library
 *     tags: [Clinical Resources]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by disease name or description
 *     responses:
 *       200:
 *         description: Array of disease resource objects
 */
router.get("/diseases", resourceController.getDiseases);

module.exports = router;
