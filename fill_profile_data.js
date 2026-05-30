require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();

  // Helper to generate 14-digit Egyptian National ID
  const generateNID = (year) => {
    const century = year >= 2000 ? '3' : '2';
    const yy = year.toString().slice(-2);
    const mm = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const dd = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const rest = String(Math.floor(Math.random() * 9999999)).padStart(7, '0');
    return `${century}${yy}${mm}${dd}${rest}`;
  };

  // Helper to generate phone number
  const generatePhone = () => {
    const prefixes = ['010', '011', '012', '015'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    return `${prefix}${rest}`;
  };

  // Get all users
  const [users] = await sequelize.query('SELECT id, email, role FROM Users WHERE email LIKE "%.demo@dermalyze.com" OR email = "doctor.demo@dermalyze.com"');

  for (const user of users) {
    let year = 1995;
    if (user.role === 'doctor') year = 1980;
    else year = 1990 + Math.floor(Math.random() * 10); // 1990-1999

    const dateOfBirth = `${year}-05-15`;
    const nationalId = generateNID(year);
    const phone = generatePhone();

    // Update User table
    await sequelize.query(`
      UPDATE Users
      SET phone = '${phone}', nationalId = '${nationalId}', dateOfBirth = '${dateOfBirth}'
      WHERE id = ${user.id}
    `);

    // Update Patient table if patient
    if (user.role === 'patient') {
      await sequelize.query(`
        UPDATE Patients
        SET phone = '${phone}', nationalId = '${nationalId}'
        WHERE userId = ${user.id}
      `);
    }
  }

  console.log("✅ Profile data (phone, dob, nid) filled for all demo users!");
  process.exit(0);
}
run();
