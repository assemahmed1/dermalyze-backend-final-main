require('dotenv').config();
const { sequelize } = require('./config/db');
const { User, Patient, Disease } = require('./models');
const SmartImprovementRate = require('./models/SmartImprovementRate');

async function run() {
  try {
    await sequelize.authenticate();

    const doctor = await User.findOne({ where: { role: 'doctor' } });
    let patient = await Patient.findOne({ where: { doctorId: doctor.id } });

    const recoveryProgress = 68;
    const rate = Math.max(1, Math.min(5, Math.ceil((recoveryProgress / 100) * 5) || 1));
    console.log("Calculated Rate:", rate); // Should be 4

    const name = 'Doxycycline';
    const dosage = '100mg';

    await sequelize.query(`INSERT IGNORE INTO smart_patients (patient_id, first_name, last_name) VALUES (${patient.id}, '${patient.name.split(' ')[0] || patient.name}', '${patient.name.split(' ').slice(1).join(' ') || ''}')`);
    
    let [treatment] = await sequelize.query(`SELECT treatment_id FROM smart_treatments WHERE name = '${name}' AND dosage = '${dosage}'`);
    let treatmentId;
    if (!treatment || treatment.length === 0) {
      const [result] = await sequelize.query(`INSERT INTO smart_treatments (name, dosage) VALUES ('${name}', '${dosage}')`);
      treatmentId = result;
    } else {
      treatmentId = treatment[0].treatment_id;
    }

    console.log("Treatment ID:", treatmentId);

    const newRate = await SmartImprovementRate.create({
      patient_id: patient.id,
      treatment_id: treatmentId,
      doctor_id: doctor.id,
      rate: rate,
      status: "active",
      date: new Date()
    });

    console.log("Successfully created SmartImprovementRate");
    process.exit(0);
  } catch (err) {
    console.error("Smart History Logging Error:", err);
    process.exit(1);
  }
}
run();
