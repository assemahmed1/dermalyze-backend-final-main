require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();

    const [results] = await sequelize.query(`
      SELECT 
        t.name AS treatment_name,
        t.dosage AS dosage,
        ROUND(AVG(ir.rate), 1) AS average_rate,
        COUNT(DISTINCT ir.patient_id) AS patient_count
      FROM smart_improvement_rates ir
      INNER JOIN smart_treatments t ON ir.treatment_id = t.treatment_id
      INNER JOIN smart_patients sp ON ir.patient_id = sp.patient_id
      INNER JOIN Patients p ON p.name = CONCAT(sp.first_name, ' ', sp.last_name)
      INNER JOIN Diseases d ON p.diagnosisId = d.id
      WHERE LOWER(d.name) LIKE '%acne%'
      GROUP BY t.treatment_id, t.name, t.dosage
    `);
    
    console.log("MANUAL QUERY RESULT:", results);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
