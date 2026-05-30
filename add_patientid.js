require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query("ALTER TABLE Disease_Reports ADD COLUMN patientId INTEGER UNSIGNED DEFAULT NULL");
    console.log("patientId added successfully.");
    process.exit(0);
  } catch (err) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Column already exists");
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  }
}
run();
