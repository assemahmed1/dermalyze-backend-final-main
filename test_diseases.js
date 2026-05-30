require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SELECT id, name FROM Diseases WHERE id IN (27, 28, 29, 30, 31)");
    console.log("Diseases:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
