require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  const arr = await sequelize.query(`INSERT INTO smart_treatments (name, dosage, \`usage\`, createdAt, updatedAt) VALUES ('TestDestructure2', '100mg', 'Daily', NOW(), NOW())`);
  console.log("arr:", arr);
  const [result, metadata] = arr;
  console.log("result:", result, typeof result, Array.isArray(result));
  process.exit(0);
}
run();
