require('dotenv').config();
const { invalidateCache } = require('./middlewares/cacheMiddleware');

async function run() {
  await invalidateCache('resources_diseases');
  await invalidateCache('disease_report');
  console.log("Cache cleared!");
  process.exit(0);
}
run();
