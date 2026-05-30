require('dotenv').config();
const { sequelize } = require('./config/db');
const { getDiseaseReportFromDB } = require('./routes/diseaseReport.repository');

async function run() {
  try {
    await sequelize.authenticate();
    
    console.log("Calling getDiseaseReportFromDB('acne vulgaris')...");
    const report = await getDiseaseReportFromDB('acne vulgaris');

    console.log("\nResponse JSON:");
    console.log(JSON.stringify(report, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
