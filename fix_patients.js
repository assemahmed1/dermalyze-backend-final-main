require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  
  // Find doctor
  const [dr] = await sequelize.query(`SELECT id FROM Users WHERE email = 'dr.ahmed.elsayed@dermalyze.com'`);
  const doctorId = dr[0].id;
  
  // Update patients to belong to this doctor
  await sequelize.query(`UPDATE Users SET doctorId = ${doctorId} WHERE email LIKE '%.demo@dermalyze.com'`);
  
  console.log("Patients linked to doctor successfully.");
  process.exit(0);
}
run();
