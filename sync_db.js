require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');
require('./models');
async function run() {
  await connectDB();
  await sequelize.sync({ alter: true });
  console.log("DB synced with alter: true");
  process.exit();
}
run();
