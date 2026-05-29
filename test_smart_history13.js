require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();

    let [t] = await sequelize.query(`SELECT * FROM smart_treatments`);
    console.log("TREATMENTS:", t);

    let [sp] = await sequelize.query(`SELECT * FROM smart_patients`);
    console.log("PATIENTS:", sp);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
