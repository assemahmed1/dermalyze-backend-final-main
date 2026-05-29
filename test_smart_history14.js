require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();

    let [treatment] = await sequelize.query(`SELECT treatment_id FROM smart_treatments WHERE name = 'Doxycycline' AND dosage = '100mg'`);
    let treatmentId;
    if (!treatment || treatment.length === 0) {
      const [result] = await sequelize.query(`INSERT INTO smart_treatments (name, dosage, \`usage\`, createdAt, updatedAt) VALUES ('Doxycycline', '100mg', 'Daily', NOW(), NOW())`);
      treatmentId = result;
      console.log("INSERTED treatmentId:", treatmentId);
    } else {
      treatmentId = treatment[0].treatment_id;
      console.log("FOUND treatmentId:", treatmentId);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
