require('dotenv').config();
const { sequelize } = require('./config/db');
const { User, Patient, Medication, ClinicalMedication } = require('./models');
const { addMedication } = require('./controllers/medicationController');

async function run() {
  try {
    await sequelize.authenticate();
    
    // Check if ClinicalMedications has Hydrocortisone
    const match = await ClinicalMedication.findOne({ where: { name: { [require('sequelize').Op.like]: '%Hydrocortisone%' } } });
    console.log("ClinicalMedication found:", match ? match.name : 'None');

    const doctor = await User.findOne({ where: { role: 'doctor' } });
    if (!doctor) throw new Error("No doctor");

    let patient = await Patient.findOne({ where: { doctorId: doctor.id } });
    
    const req = {
      params: { patientId: patient.id },
      body: { name: 'Hydrocortisone', dosage: '1%', frequency: 'Twice daily', notes: 'Apply gently' },
      user: { id: doctor.id }
    };
    
    const res = { status: (code) => res, json: (data) => console.log('Medication added JSON response') };
    const next = (err) => { if(err) console.error(err); };

    await addMedication(req, res, next);

    // Wait a bit for the async block
    await new Promise(r => setTimeout(r, 1000));

    const latestMed = await Medication.findOne({ order: [['createdAt', 'DESC']] });
    console.log("LATEST MEDICATION:");
    console.log(`id: ${latestMed.id}, name: ${latestMed.name}, clinicalMedicationId: ${latestMed.clinicalMedicationId}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
