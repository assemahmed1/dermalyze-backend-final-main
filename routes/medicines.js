const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

const getAuthClient = () =>
  new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

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
router.get("/medicines/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "medicines!A:C"
    });

    const rows = response.data.values.slice(1); // skip header
    const query = q.toLowerCase();

    const results = rows
      .filter((row) =>
        row[0]?.toLowerCase().includes(query) ||
        row[1]?.toLowerCase().includes(query)
      )
      .slice(0, 20)
      .map((row) => ({
        name: row[0] || "N/A",
        activeIngredient: row[1] || "N/A",
        category: row[2] || "N/A",
      }));

    res.json({ success: true, total: results.length, results });
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
router.get("/medicines/match", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "medicines_clean!A:C",
    });

    const rows = response.data.values.slice(1); // skip header
    const query = q.toLowerCase().trim();

    const results = rows
      .filter((row) =>
        row[0]?.toLowerCase() === query ||
        row[1]?.toLowerCase() === query
      )
      .map((row) => ({
        name: row[0] || "N/A",
        activeIngredient: row[1] || "N/A",
        category: row[2] || "N/A",
      }));

    res.json({ success: true, total: results.length, results });
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
router.get("/medicines/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;

    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "medicines_clean!A:C",
    });

    const rows = response.data.values.slice(1); // skip header

    const allMedications = rows.map((row) => ({
      name: row[0] || "N/A",
      activeIngredient: row[1] || "N/A",
      category: row[2] || "N/A",
    }));

    const paginatedData = allMedications.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      total: allMedications.length,
      page,
      limit,
      totalPages: Math.ceil(allMedications.length / limit),
      data: paginatedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;