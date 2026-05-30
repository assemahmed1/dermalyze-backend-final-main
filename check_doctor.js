require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  const dr = await sequelize.query(`SELECT id, name, email, role FROM Users WHERE email = 'dr.ahmed.elsayed@dermalyze.com'`, { type: QueryTypes.SELECT });
  console.log("Doctor in Users table:", dr);
  
  const smartDr = await sequelize.query(`SELECT doctor_id, first_name, last_name, email FROM smart_doctors WHERE email = 'dr.ahmed.elsayed@dermalyze.com'`, { type: QueryTypes.SELECT });
  console.log("Doctor in smart_doctors table:", smartDr);
  process.exit(0);
}
run();
