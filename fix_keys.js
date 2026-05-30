require('dotenv').config();
const { sequelize } = require('./config/db');

async function run() {
  try {
    await sequelize.authenticate();
    const [indexes] = await sequelize.query(`SHOW INDEX FROM Users`);
    const emailIndexes = indexes.filter(i => i.Column_name === 'email' && i.Key_name !== 'PRIMARY');
    
    console.log("Found email indexes:", emailIndexes.length);
    
    // We will keep one (e.g., named 'email' or the first one) and drop the rest
    let kept = false;
    for (const idx of emailIndexes) {
      if (idx.Key_name === 'email' || !kept) {
         if (idx.Key_name === 'email') kept = true;
         else if (!kept) kept = true; // keep the first one
         continue;
      }
      console.log(`Dropping index ${idx.Key_name}`);
      await sequelize.query(`ALTER TABLE Users DROP INDEX \`${idx.Key_name}\``);
    }
    
    console.log("Finished dropping duplicate email indexes.");

    const [allIndexes] = await sequelize.query(`SHOW INDEX FROM Users`);
    const phoneIndexes = allIndexes.filter(i => i.Column_name === 'phone' || i.Column_name === 'doctorCode');
    
    for (const idx of allIndexes) {
       // Also drop any other duplicate indices if there are many
       // actually let's just group by column name and drop duplicates
       // wait, composite indexes exist.
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
