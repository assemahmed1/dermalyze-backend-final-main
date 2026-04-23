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
      range: "final_without_dosage!A:F",
    });

    const rows = response.data.values || [];
    const data = rows.slice(1);
    const query = q.toLowerCase();

    const results = data
      .filter((row) =>
        row[1]?.toLowerCase().includes(query) ||
        row[2]?.toLowerCase().includes(query)
      )
      .slice(0, 20)
      .map((row) => ({
        name: row[1] || "N/A",
        genericName: row[2] || "N/A",
        category: row[5] || "Other",
        diseaseName: row[0] || "N/A",
        prescriptionRequired: row[4] === "Required",
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
      range: "final_without_dosage!A:F",
    });

    const rows = response.data.values || [];
    const data = rows.slice(1);
    const query = q.toLowerCase().trim();

    const results = data
      .filter((row) =>
        row[1]?.toLowerCase() === query ||
        row[2]?.toLowerCase() === query
      )
      .map((row) => ({
        name: row[1] || "N/A",
        genericName: row[2] || "N/A",
        category: row[5] || "Other",
        diseaseName: row[0] || "N/A",
        prescriptionRequired: row[4] === "Required",
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
      range: "final_without_dosage!A:F",
    });

    const rows = response.data.values || [];
    const data = rows.slice(1);

    const allMedications = data.map((row) => ({
      name: row[1] || "N/A",
      genericName: row[2] || "N/A",
      category: row[5] || "Other",
      diseaseName: row[0] || "N/A",
      prescriptionRequired: row[4] === "Required",
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