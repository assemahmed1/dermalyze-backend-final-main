const { connectDB, sequelize } = require('./config/db');
require('./models');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Medication = require('./models/Medication');

(async () => {
  await connectDB();
  const doctors = await User.findAll({ where: { role: 'doctor' }, limit: 5 });
  console.log("Doctors found:");
  doctors.forEach(d => console.log(`ID: ${d.id}, Name: ${d.name}`));

  if (doctors.length > 0) {
    const doctorId = doctors[0].id;
    const patients = await Patient.findAll({ where: { doctorId } });
    console.log(`\nPatients for Doctor ${doctorId}:`);
    patients.forEach(p => console.log(`Patient ID: ${p.id}, Name: ${p.name}, Diagnosis: ${p.diagnosis}`));
  }
  
  process.exit(0);
})();
