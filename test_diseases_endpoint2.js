require('dotenv').config();
const { sequelize } = require('./config/db');
const { getDiseases } = require('./controllers/resourceController');

async function run() {
  await sequelize.authenticate();
  
  const req = { query: {} };
  const res = {
    json: (data) => {
      let badItems = [];
      for(let d of data) {
         if (!Array.isArray(d.symptoms)) badItems.push({name: d.name, issue: 'symptoms not array'});
         if (!Array.isArray(d.treatments)) badItems.push({name: d.name, issue: 'treatments not array'});
         if (d.symptoms && d.symptoms.some(s => typeof s !== 'string')) badItems.push({name: d.name, issue: 'symptoms item not string'});
         if (!d.name || typeof d.name !== 'string') badItems.push({name: d.name, issue: 'bad name'});
         if (!d.description || typeof d.description !== 'string') badItems.push({name: d.name, issue: 'bad description'});
         if (d.imageUrl && typeof d.imageUrl !== 'string') badItems.push({name: d.name, issue: 'bad imageUrl'});
      }
      console.log("Bad items count:", badItems.length);
      if (badItems.length > 0) console.log(badItems.slice(0, 10));
      process.exit(0);
    }
  };
  const next = (err) => { console.error(err); process.exit(1); };
  
  await getDiseases(req, res, next);
}
run();
