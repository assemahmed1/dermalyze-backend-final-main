require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  const [result, metadata] = await sequelize.query(`INSERT INTO smart_treatments (name, dosage, \`usage\`, createdAt, updatedAt) VALUES ('TestDestructure', '100mg', 'Daily', NOW(), NOW())`);
  console.log("result:", result);
  console.log("metadata:", metadata);
  process.exit(0);
}
run();
