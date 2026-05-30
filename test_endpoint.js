require('dotenv').config();
const { sequelize } = require('./config/db');
const { User } = require('./models');
const jwt = require('jsonwebtoken');

async function run() {
  try {
    await sequelize.authenticate();
    
    // Find a patient
    const patientUser = await User.findOne({ where: { role: 'patient' } });
    if (!patientUser) throw new Error("No patient found");

    // Generate token
    const token = jwt.sign(
      { id: patientUser.id, role: patientUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log("Token generated for patient:", patientUser.email);

    // Call endpoint
    const response = await fetch('http://localhost:8080/api/disease-report?disease=Acne%20Vulgaris', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log("Response JSON:");
    console.log(JSON.stringify(data, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
