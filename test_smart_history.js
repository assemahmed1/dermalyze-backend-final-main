require('dotenv').config();
const jwt = require('jsonwebtoken');
const { sequelize } = require('./config/db');
const { User, Patient, Disease } = require('./models');

async function run() {
  await sequelize.authenticate();
  const doctor = await User.findOne({ where: { role: 'doctor' } });
  if (!doctor) {
    console.log("No doctor found");
    return;
  }
  const token = jwt.sign({ id: doctor.id, role: 'doctor' }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1h' });
  
  const response = await fetch(`http://localhost:5050/api/smart-history/treatments?disease=acne`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
