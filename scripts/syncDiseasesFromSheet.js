require("dotenv").config();
const { google } = require("googleapis");
const { connectDB, sequelize } = require("../config/db");

// Load models and register all associations
require("../models");

const Disease = require("../models/Disease");
const DiseaseReport = require("../models/DiseaseReport");
const ClinicalDisease = require("../models/ClinicalDisease");
const SmartDisease = require("../models/SmartDisease");

const getAuthClient = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON in environment variables.");
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
};

async function syncDiseases() {
  try {
    console.log("🔄 Connecting to MySQL Database...");
    await connectDB();
    await sequelize.sync();
    console.log("✅ MySQL Database connected and models synchronized.");

    console.log("🔄 Fetching diseases from Google Sheet...");
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    
    const spreadsheetId = process.env.DISEASES_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("Missing DISEASES_SHEET_ID in environment variables.");
    }

    // Get spreadsheet metadata to see tab names
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    const tabName = sheetNames.includes("diseases_library") ? "diseases_library" : sheetNames[0];

    console.log(`🔍 Downloading records from tab: "${tabName}"...`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:E`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log("⚠️ No disease records found in the Google Sheet (or only header row exists).");
      process.exit(0);
    }

    const dataRows = rows.slice(1); // Skip header row
    console.log(`📥 Downloaded ${dataRows.length} disease records. Starting database sync...`);

    // In-memory deduplication and parsing
    const uniqueEntriesMap = new Map();
    for (const row of dataRows) {
      const folderName = row[1] || "";
      const commonName = (row[2] || "").trim();
      const scientificName = (row[3] || "").trim();
      const category = (row[4] || "").trim();

      if (!commonName) continue; // Skip rows without a common name

      uniqueEntriesMap.set(commonName, {
        commonName,
        scientificName: scientificName || commonName,
        generalInfo: `Category: ${category || "General"}. Origin folder: ${folderName}.`,
        clinicalDescription: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}. Folder: ${folderName}.`,
        smartDescription: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}.`
      });
    }

    const uniqueEntries = Array.from(uniqueEntriesMap.values());
    console.log(`✨ Parsed ${uniqueEntries.length} unique skin diseases. Performing batch bulk create...`);

    // Use a database transaction for data safety and speed
    await sequelize.transaction(async (t) => {
      // 1. Sync in Diseases table
      const diseaseData = uniqueEntries.map(e => ({
        name: e.commonName,
        scientificName: e.scientificName,
        generalInfo: e.generalInfo
      }));
      await Disease.bulkCreate(diseaseData, {
        updateOnDuplicate: ["scientificName", "generalInfo"],
        transaction: t
      });

      // Fetch all diseases to get IDs for DiseaseReports
      const allDiseases = await Disease.findAll({ transaction: t });
      const existingReports = await DiseaseReport.findAll({ attributes: ["diseaseId"], transaction: t });
      const existingReportIds = new Set(existingReports.map(r => r.diseaseId));

      // Create missing DiseaseReport entries
      const newReports = allDiseases
        .filter(d => !existingReportIds.has(d.id))
        .map(d => ({
          diseaseId: d.id,
          symptoms: [],
          sideEffects: [],
          improvementSigns: []
        }));

      if (newReports.length > 0) {
        await DiseaseReport.bulkCreate(newReports, { transaction: t });
      }

      // 2. Sync in ClinicalDiseases table
      const clinicalData = uniqueEntries.map(e => ({
        name: e.commonName,
        description: e.clinicalDescription,
        symptoms: [],
        treatments: [],
        imageUrl: ""
      }));
      await ClinicalDisease.bulkCreate(clinicalData, {
        updateOnDuplicate: ["description"],
        transaction: t
      });

      // 3. Sync in SmartDisease table
      const smartData = uniqueEntries.map(e => ({
        name: e.commonName,
        description: e.smartDescription,
        symptoms: ""
      }));
      await SmartDisease.bulkCreate(smartData, {
        updateOnDuplicate: ["description"],
        transaction: t
      });
    });

    console.log(`\n🎉 SUCCESS! Successfully synced ${uniqueEntries.length} skin diseases to MySQL from Google Sheets in batch bulk mode.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync Error:", error.stack || error.message);
    process.exit(1);
  }
}

syncDiseases();
