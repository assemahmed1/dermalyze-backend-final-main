require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();

    console.log("TESTING JOINS STEP BY STEP:");

    let [r1] = await sequelize.query(`SELECT ir.*, t.* FROM smart_improvement_rates ir INNER JOIN smart_treatments t ON ir.treatment_id = t.treatment_id`);
    console.log("JOIN 1 (rates + treatments):", r1.length);

    let [r2] = await sequelize.query(`SELECT ir.*, sp.* FROM smart_improvement_rates ir INNER JOIN smart_patients sp ON ir.patient_id = sp.patient_id`);
    console.log("JOIN 2 (rates + smart_patients):", r2.length);

    let [r3] = await sequelize.query(`SELECT sp.*, p.name as p_name FROM smart_patients sp INNER JOIN Patients p ON p.name = CONCAT(sp.first_name, ' ', sp.last_name)`);
    console.log("JOIN 3 (smart_patients + Patients):", r3.length);

    let [r4] = await sequelize.query(`SELECT p.*, d.* FROM Patients p INNER JOIN Diseases d ON p.diagnosisId = d.id WHERE LOWER(d.name) LIKE '%acne%'`);
    console.log("JOIN 4 (Patients + Diseases + acne):", r4.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
