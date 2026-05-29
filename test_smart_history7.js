require('dotenv').config();
const { sequelize } = require('./config/db');
const { User, Patient, Disease } = require('./models');
const { getTreatmentsByDisease } = require('./routes/smartHistory.repository');
const { addMedication } = require('./controllers/medicationController');

async function run() {
  try {
    await sequelize.authenticate();

    const doctor = await User.findOne({ where: { role: 'doctor' } });
    if (!doctor) throw new Error("No doctor");

    // Wait a brief moment to ensure fire-and-forget completed (or use a direct loop to wait)
    for (let i = 0; i < 10; i++) {
        const [rates] = await sequelize.query(`SELECT * FROM smart_improvement_rates`);
        if (rates.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, 500));
    }

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
