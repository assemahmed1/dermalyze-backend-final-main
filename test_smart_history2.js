require('dotenv').config();
const { sequelize } = require('./config/db');
const { User, Patient, Disease } = require('./models');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');

async function run() {
  try {
    await sequelize.authenticate();
    const doctor = await User.findOne({ where: { role: 'doctor' } });
    if (!doctor) {
      console.log("No doctor found");
      return;
    }
    
    // Call the repository function directly
    const results = await getTreatmentsByDisease(doctor.id, 'acne');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
