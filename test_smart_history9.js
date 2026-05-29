require('dotenv').config();
const { sequelize } = require('./config/db');
const { User } = require('./models');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');

async function run() {
  try {
    await sequelize.authenticate();

    const doctor = await User.findOne({ where: { role: 'doctor' } });
    
    // Test the repository directly, because the INSERT is already complete from the previous script run
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
