require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SELECT id, name FROM Diseases WHERE name LIKE '%Acne%'");
    console.log("Acne diseases:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
