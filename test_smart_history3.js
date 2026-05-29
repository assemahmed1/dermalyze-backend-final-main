require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');

async function run() {
  try {
    await sequelize.authenticate();
    const [doctor] = await sequelize.query("SELECT id FROM Users WHERE role='doctor' LIMIT 1", { type: QueryTypes.SELECT });
    
    // Seed disease if not exists
    await sequelize.query(`INSERT IGNORE INTO Diseases (id, name, createdAt, updatedAt) VALUES (999, 'Severe Acne', NOW(), NOW())`);
    
    // Seed a patient linked to doctor
    await sequelize.query(`INSERT IGNORE INTO Patients (id, name, diagnosisId, doctorId, createdAt, updatedAt) VALUES (999, 'John Doe', 999, ${doctor.id}, NOW(), NOW())`);
    
    // Seed smart history stuff
    await sequelize.query(`INSERT IGNORE INTO smart_patients (patient_id, first_name, last_name) VALUES (999, 'John', 'Doe')`);
    await sequelize.query(`INSERT IGNORE INTO smart_treatments (treatment_id, name, dosage) VALUES (999, 'Isotretinoin', '20mg/day')`);
    await sequelize.query(`INSERT IGNORE INTO smart_improvement_rates (id, patient_id, treatment_id, doctor_id, rate, timestamp) VALUES (999, 999, 999, ${doctor.id}, 85, NOW())`);
    
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
