require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  const d = await sequelize.query(`SELECT * FROM Diseases LIMIT 2`, { type: QueryTypes.SELECT });
  console.log("Diseases table sample:", d);
  
  const dr = await sequelize.query(`SELECT * FROM Disease_Reports LIMIT 2`, { type: QueryTypes.SELECT });
  console.log("Disease_Reports table sample:", dr);
  process.exit(0);
}
run();
