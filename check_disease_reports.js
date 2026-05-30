require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM Disease_Reports');
    console.log("Count:", countResult[0].count);

    const [rows] = await sequelize.query('SELECT * FROM Disease_Reports LIMIT 5');
    console.log("Rows:", JSON.stringify(rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
