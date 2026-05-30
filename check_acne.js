require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SELECT * FROM Disease_Reports WHERE diseaseId = 21");
    console.log("Report for 21:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
