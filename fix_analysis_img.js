require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  // Get a valid Cloudinary image from Acne Vulgaris
  const d = await sequelize.query(`SELECT imageUrl FROM Diseases WHERE name = 'Acne Vulgaris' LIMIT 1`, { type: QueryTypes.SELECT });
  const validUrl = d[0].imageUrl;
  console.log("Using valid image URL:", validUrl);

  // Update all placeholders
  const [result] = await sequelize.query(`
    UPDATE Analyses 
    SET imageUrl = '${validUrl}' 
    WHERE imageUrl LIKE '%placeholder.com%' OR imageUrl IS NULL OR imageUrl = ''
  `);

  console.log("Updated rows:", result.affectedRows);
  process.exit(0);
}
run();
