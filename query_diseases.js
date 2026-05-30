require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    const count = await sequelize.query(`SELECT COUNT(*) as count FROM Diseases`, { type: QueryTypes.SELECT });
    const samples = await sequelize.query(`SELECT name FROM Diseases LIMIT 10`, { type: QueryTypes.SELECT });
    console.log("Count:", count[0].count);
    console.log("Samples:", samples.map(s => s.name));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
