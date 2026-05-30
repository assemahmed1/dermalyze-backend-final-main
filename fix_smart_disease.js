require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  const sd = await sequelize.query(
    `SELECT * FROM smart_diseases WHERE disease_id = 30`,
    { type: QueryTypes.SELECT }
  );
  console.log("SD 30:", sd);
  process.exit(0);
}
run();
