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
router.get("/medicines/search", auth, requireRole("doctor"), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:F",
    });

    const rows = response.data.values || [];
    const data = rows.slice(1);
    const query = q.toLowerCase();

    const results = data
      .filter(row =>
        row[1]?.toLowerCase().includes(query) ||
        row[2]?.toLowerCase().includes(query)
      )
      .slice(0, 20)
      .map(row => ({
        diseaseName: row[0],
        medName: row[1],
        genericName: row[2],
        prescriptionRequired: row[4] === "Required",
        category: row[5],
      }));

    res.json({ success: true, total: results.length, results });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;