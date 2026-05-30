require('dotenv').config();
const { sequelize } = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function run() {
  await sequelize.authenticate();
  
  // Fix Doctor
  const drHash = await bcrypt.hash('Demo@2024', 10);
  await sequelize.query(`UPDATE Users SET password = '${drHash}' WHERE email = 'dr.ahmed.elsayed@dermalyze.com'`);
  
  // Fix Patients
  const ptHash = await bcrypt.hash('Patient@2024', 10);
  await sequelize.query(`UPDATE Users SET password = '${ptHash}' WHERE email LIKE '%.demo@dermalyze.com'`);
  
  console.log("Passwords fixed successfully.");
  process.exit(0);
}
run();
