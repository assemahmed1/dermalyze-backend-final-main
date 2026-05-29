require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  const result = await sequelize.query(`INSERT INTO smart_treatments (name, dosage, \`usage\`, createdAt, updatedAt) VALUES ('Test', '100mg', 'Daily', NOW(), NOW())`);
  console.log("INSERT RESULT:", result);
  process.exit(0);
}
run();
