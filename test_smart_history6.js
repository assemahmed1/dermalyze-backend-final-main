require('dotenv').config();
const { sequelize } = require('./config/db');
const { User, Patient, Disease } = require('./models');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');
const { addMedication } = require('./controllers/medicationController');
const SmartImprovementRate = require('./models/SmartImprovementRate');

async function run() {
  try {
    await sequelize.authenticate();

    // 1. Delete the mock data from earlier
    await sequelize.query(`DELETE FROM smart_improvement_rates`);
    await sequelize.query(`DELETE FROM smart_treatments`);
    
    // 2. Setup a real patient
    const doctor = await User.findOne({ where: { role: 'doctor' } });
    if (!doctor) throw new Error("No doctor");

    // Ensure disease exists
    await sequelize.query(`INSERT IGNORE INTO Diseases (id, name, createdAt, updatedAt) VALUES (888, 'Testing Acne', NOW(), NOW())`);

    // Setup patient with recoveryProgress = 68
    let patient = await Patient.findOne({ where: { doctorId: doctor.id } });
    if (!patient) {
      patient = await Patient.create({ name: 'Real Patient', doctorId: doctor.id, diagnosisId: 888, recoveryProgress: 68 });
    } else {
      await patient.update({ recoveryProgress: 68, diagnosisId: 888 });
    }

    // 3. Mock Express Request/Response for addMedication
    const req = {
      params: { patientId: patient.id },
      body: { name: 'Doxycycline', dosage: '100mg', frequency: 'Daily', notes: 'Test' },
      user: { id: doctor.id }
    };

    const res = {
      status: (code) => res,
      json: (data) => console.log('Medication added:', data.message)
    };

    const next = (err) => { if(err) console.error(err); };

    await addMedication(req, res, next);

    // Wait a brief moment for the fire-and-forget block to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Test the repository
    const results = await getTreatmentsByDisease(doctor.id, 'acne');
    console.log("FINAL TREATMENTS OUTPUT:");
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
