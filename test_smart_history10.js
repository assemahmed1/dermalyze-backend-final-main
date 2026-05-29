require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();

    const [rates] = await sequelize.query(`SELECT * FROM smart_improvement_rates`);
    console.log("RATES:", rates);

    const [patients] = await sequelize.query(`SELECT id, name, diagnosisId FROM Patients WHERE id = 1`);
    console.log("PATIENT:", patients);

    const [diseases] = await sequelize.query(`SELECT * FROM Diseases WHERE name LIKE '%acne%'`);
    console.log("DISEASES:", diseases);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
