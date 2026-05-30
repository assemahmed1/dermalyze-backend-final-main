require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  const sd = await sequelize.query(`SELECT * FROM smart_diseases LIMIT 5`, { type: QueryTypes.SELECT });
  const sdCount = await sequelize.query(`SELECT count(*) as count FROM smart_diseases`, { type: QueryTypes.SELECT });
  console.log("smart_diseases count:", sdCount[0].count);
  console.log("smart_diseases sample:", sd);
  process.exit(0);
}
run();
