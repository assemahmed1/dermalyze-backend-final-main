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

    let syncedDiseasesCount = 0;

    for (const row of dataRows) {
      const folderName = row[1] || "";
      const commonName = row[2] || "";
      const scientificName = row[3] || "";
      const category = row[4] || "";

      if (!commonName) continue; // Skip rows without a common name

      // 1. Sync in Diseases & Disease_Reports (For Encyclopedia & Reports API)
      const [diseaseRecord] = await Disease.findOrCreate({
        where: { name: commonName },
        defaults: {
          scientificName: scientificName || commonName,
          generalInfo: `Category: ${category || "General"}. Origin folder: ${folderName}.`
        }
      });

      // Update scientificName/generalInfo if it already existed
      await Disease.update({
        scientificName: scientificName || commonName,
        generalInfo: `Category: ${category || "General"}. Origin folder: ${folderName}.`
      }, {
        where: { id: diseaseRecord.id }
      });

      // Ensure a matching DiseaseReport entry exists for 100% compatibility
      await DiseaseReport.findOrCreate({
        where: { diseaseId: diseaseRecord.id },
        defaults: {
          symptoms: [],
          sideEffects: [],
          improvementSigns: []
        }
      });

      // 2. Sync in ClinicalDiseases (For Doctor Clinical Records & Lists)
      const [clinicalRecord] = await ClinicalDisease.findOrCreate({
        where: { name: commonName },
        defaults: {
          description: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}. Folder: ${folderName}.`,
          symptoms: [],
          treatments: [],
          imageUrl: ""
        }
      });

      await ClinicalDisease.update({
        description: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}. Folder: ${folderName}.`
      }, {
        where: { id: clinicalRecord.id }
      });

      // 3. Sync in smart_diseases (For Smart History Insights / AI)
      const [smartRecord] = await SmartDisease.findOrCreate({
        where: { name: commonName },
        defaults: {
          description: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}.`,
          symptoms: ""
        }
      });

      await SmartDisease.update({
        description: `Scientific Name: ${scientificName || "N/A"}. Category: ${category || "General"}.`
      }, {
        where: { disease_id: smartRecord.disease_id }
      });

      syncedDiseasesCount++;
      console.log(`✨ Synced disease: "${commonName}" (Scientific: ${scientificName})`);
    }

    console.log(`\n🎉 SUCCESS! Successfully synced ${syncedDiseasesCount} skin diseases to MySQL from Google Sheets.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync Error:", error.stack || error.message);
    process.exit(1);
  }
}

syncDiseases();
