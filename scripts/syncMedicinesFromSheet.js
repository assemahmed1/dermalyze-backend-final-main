require("dotenv").config();
const { google } = require("googleapis");
const { connectDB, sequelize } = require("../config/db");

// Load models and register all associations
require("../models");

const ClinicalMedication = require("../models/ClinicalMedication");

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

async function syncMedicines() {
  try {
    console.log("🔄 Connecting to MySQL Database...");
    await connectDB();
    await sequelize.sync();
    console.log("✅ MySQL Database connected and models synchronized.");

    console.log("🔄 Fetching medicines from Google Sheet...");
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("Missing GOOGLE_SHEET_ID in environment variables.");
    }

    console.log("🔍 Downloading records from tab: \"medicines\"...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "medicines!A:C",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log("⚠️ No medicine records found in the Google Sheet (or only header row exists).");
      process.exit(0);
    }

    const dataRows = rows.slice(1); // Skip header row
    console.log(`📥 Downloaded ${dataRows.length} medicine records. Starting database sync...`);

    let syncedMedicinesCount = 0;

    for (const row of dataRows) {
      const name = row[0] || "";
      const activeIngredient = row[1] || "";
      const category = row[2] || "Uncategorized";

      if (!name) continue; // Skip rows without a name

      // Sync in ClinicalMedications (For Doctor Clinical Prescriptions & Search)
      const [clinicalRecord, created] = await ClinicalMedication.findOrCreate({
        where: { name },
        defaults: {
          category,
          description: `Active Ingredient: ${activeIngredient || "N/A"}.`,
          uses: [category],
          sideEffects: [],
          dosage: "As directed by physician."
        }
      });

      if (!created) {
        // Update category/description if it already existed
        await ClinicalMedication.update({
          category,
          description: `Active Ingredient: ${activeIngredient || "N/A"}.`,
          uses: [category]
        }, {
          where: { id: clinicalRecord.id }
        });
      }

      syncedMedicinesCount++;
      if (syncedMedicinesCount % 50 === 0 || syncedMedicinesCount === dataRows.length) {
        console.log(`✨ Synced ${syncedMedicinesCount}/${dataRows.length} medicines...`);
      }
    }

    console.log(`\n🎉 SUCCESS! Successfully synced ${syncedMedicinesCount} medicines to MySQL from Google Sheets.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync Error:", error.stack || error.message);
    process.exit(1);
  }
}

syncMedicines();
