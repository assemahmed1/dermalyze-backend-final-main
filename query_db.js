require('dotenv').config();
const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
  await sequelize.authenticate();
  
  const diseases = await sequelize.query(
    `SELECT id, name FROM Diseases WHERE name LIKE '%Acne%' OR name LIKE '%Psoriasis%' OR name LIKE '%Dermatitis%' OR name LIKE '%Vitiligo%' OR name LIKE '%Rosacea%' OR name LIKE '%Tinea Corporis%' OR name LIKE '%Folliculitis%' OR name LIKE '%Alopecia%' OR name LIKE '%Scabies%'`,
    { type: QueryTypes.SELECT }
  );
  console.log("Diseases:", JSON.stringify(diseases, null, 2));
  
  const meds = await sequelize.query(
    `SELECT id, name FROM ClinicalMedications WHERE name LIKE '%Clindamycin%' OR name LIKE '%Tretinoin%' OR name LIKE '%Hydrocortisone%' OR name LIKE '%Clotrimazole%' OR name LIKE '%Metronidazole%' OR name LIKE '%Benzoyl%' OR name LIKE '%Doxycycline%' OR name LIKE '%Adapalene%' OR name LIKE '%Betamethasone%' OR name LIKE '%Methotrexate%' OR name LIKE '%Coal Tar%' OR name LIKE '%Calcipotriol%' OR name LIKE '%Tacrolimus%' OR name LIKE '%Dupilumab%' OR name LIKE '%Psoralen%' LIMIT 30`,
    { type: QueryTypes.SELECT }
  );
  console.log("Meds:", JSON.stringify(meds, null, 2));
  
  process.exit(0);
}
run();
