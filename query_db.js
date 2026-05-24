require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');
async function run() {
  await connectDB();
  const diseases = await sequelize.query("SELECT * FROM Diseases");
  const clinicalDiseases = await sequelize.query("SELECT * FROM ClinicalDiseases");
  console.log("--- Diseases Table ---");
  console.log(JSON.stringify(diseases[0], null, 2));
  console.log("--- ClinicalDiseases Table ---");
  console.log(JSON.stringify(clinicalDiseases[0], null, 2));
  process.exit();
}
run();
