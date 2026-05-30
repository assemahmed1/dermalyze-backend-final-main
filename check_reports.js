require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  const c = await sequelize.query(`SELECT count(*) as count FROM Disease_Reports`, { type: QueryTypes.SELECT });
  console.log("Disease_Reports count:", c[0].count);
  process.exit(0);
}
run();
