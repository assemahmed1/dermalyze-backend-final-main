require("dotenv").config();
const { connectDB } = require("../config/db");
const { Op } = require("sequelize");
const ClinicalMedication = require("../models/ClinicalMedication");

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

async function runTests() {
  try {
    console.log("🚀 Starting DB-Backed Medicines Model Verification Tests...");
    await connectDB();

    console.log("\n--- [TEST 1] Paginated Medicines Query (all) ---");
    const page = 1;
    const limit = 5;
    const startIndex = (page - 1) * limit;

    const { count, rows } = await ClinicalMedication.findAndCountAll({
      offset: startIndex,
      limit: limit,
      order: [["name", "ASC"]]
    });

    const paginatedData = rows.map(mapMedication);
    console.log("Total Count in DB:", count);
    console.log("Returned Data Count:", paginatedData.length);
    console.log("First Item:", paginatedData[0]);

    if (count === 0 || paginatedData.length === 0) {
      throw new Error("❌ No medicines found in database. Did you run the sync script first?");
    }
    console.log("✅ Paginated query passed!");

    console.log("\n--- [TEST 2] Search Medicines Query (search for 'Cream' or 'Wash') ---");
    const query = "Wash";
    const searchResults = await ClinicalMedication.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { category: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 5
    });

    const mappedSearch = searchResults.map(mapMedication);
    console.log("Results Found:", mappedSearch.length);
    console.log("Matching Items:", mappedSearch);
    console.log("✅ Search query passed!");

    console.log("\n--- [TEST 3] Exact Match Query (match) ---");
    const testName = mappedSearch[0].name;
    console.log(`Matching exact name: "${testName}"...`);
    const matchResults = await ClinicalMedication.findAll({
      where: {
        [Op.or]: [
          { name: testName },
          { description: { [Op.like]: `%Active Ingredient: ${testName}%` } }
        ]
      }
    });

    const mappedMatches = matchResults.map(mapMedication);
    console.log("Exact Match Results Found:", mappedMatches.length);
    console.log("Matched Item:", mappedMatches[0]);

    if (mappedMatches.length === 0) {
      throw new Error("❌ Exact match failed!");
    }
    console.log("✅ Exact match passed!");

    console.log("\n🎉 All Medicines DB-Backed SQL Tests Passed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test suite encountered a failure:", error);
    process.exit(1);
  }
}

runTests();
