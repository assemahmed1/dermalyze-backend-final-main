require('dotenv').config();
const { sequelize } = require('./config/db');
const { getDiseases } = require('./controllers/resourceController');

async function run() {
  await sequelize.authenticate();
  
  const req = { query: {} };
  const res = {
    json: (data) => {
      console.log("Returned Data Length:", data.length);
      console.log("Sample 1 symptoms type:", typeof data[0].symptoms, Array.isArray(data[0].symptoms));
      console.log("Sample 1 visualPatterns type:", typeof data[0].visualPatterns, Array.isArray(data[0].visualPatterns));
      console.log("Sample 1 treatments type:", typeof data[0].treatments, Array.isArray(data[0].treatments));
      console.log("Sample 1 generalInfo:", !!data[0].generalInfo);
      console.log("Sample 1 description:", !!data[0].description);
      console.log("Sample 1 imageUrl:", data[0].imageUrl);
      
      // Let's find any object that has a non-array or weird field
      const badSymptoms = data.filter(d => !Array.isArray(d.symptoms));
      if (badSymptoms.length > 0) console.log("BAD SYMPTOMS:", badSymptoms.length);
      
      process.exit(0);
    }
  };
  const next = (err) => { console.error(err); process.exit(1); };
  
  await getDiseases(req, res, next);
}
run();
