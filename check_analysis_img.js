require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  const a = await sequelize.query(`SELECT imageUrl FROM Analyses LIMIT 5`, { type: QueryTypes.SELECT });
  console.log("Analysis images:", a);
  process.exit(0);
}
run();
