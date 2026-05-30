require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`ALTER TABLE smart_treatments ADD COLUMN clinicalMedicationId INTEGER UNSIGNED DEFAULT NULL;`);
    console.log("Column clinicalMedicationId added to smart_treatments.");
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
