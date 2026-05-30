require('dotenv').config();
const { sequelize } = require('./config/db');
const Disease = require('./models/Disease');

async function run() {
  await sequelize.authenticate();
  const diseases = await Disease.findAll({ limit: 1 });
  const plain = diseases[0].get({ plain: true });
  console.log("Output:");
  console.log("symptoms type:", typeof plain.symptoms, Array.isArray(plain.symptoms));
  console.log("treatments type:", typeof plain.treatments, Array.isArray(plain.treatments));
  console.log("visualPatterns type:", typeof plain.visualPatterns, Array.isArray(plain.visualPatterns));
  console.log(plain);
  process.exit(0);
}
run();
