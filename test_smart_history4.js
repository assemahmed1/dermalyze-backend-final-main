require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');

async function run() {
  try {
    await sequelize.authenticate();
    const [doctor] = await sequelize.query("SELECT id FROM Users WHERE role='doctor' LIMIT 1", { type: QueryTypes.SELECT });
    
    await sequelize.query(`INSERT IGNORE INTO smart_improvement_rates (patient_id, treatment_id, doctor_id, rate, timestamp) VALUES (999, 999, ${doctor.id}, 85, NOW())`);
    
    const results = await getTreatmentsByDisease(doctor.id, 'acne');
    console.log("FINAL OUTPUT:");
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
