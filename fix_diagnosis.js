require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  
  // Patient table has diagnosis and diagnosisId
  // Update Patient diagnosis string using the Diseases table
  await sequelize.query(`
    UPDATE Patients p
    JOIN Diseases d ON p.diagnosisId = d.id
    SET p.diagnosis = d.name
    WHERE p.userId IN (SELECT id FROM Users WHERE email LIKE '%.demo@dermalyze.com')
  `);

  // Update User diagnosis string
  await sequelize.query(`
    UPDATE Users u
    JOIN Patients p ON p.userId = u.id
    SET u.diagnosis = p.diagnosis
    WHERE u.email LIKE '%.demo@dermalyze.com'
  `);

  console.log("Diagnosis strings fixed successfully.");
  process.exit(0);
}
run();
