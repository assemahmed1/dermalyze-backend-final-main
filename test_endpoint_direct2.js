require('dotenv').config();
const { sequelize } = require('./config/db');
const { getDiseaseReportFromDB } = require('./routes/diseaseReport.repository');

async function run() {
  try {
    await sequelize.authenticate();
    
    console.log("Calling getDiseaseReportFromDB('atopic dermatitis', 1)...");
    // passing 1 as patientId to get personalized info
    const report = await getDiseaseReportFromDB('atopic dermatitis', 1);

    console.log("\nResponse JSON:");
    console.log(JSON.stringify(report, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
