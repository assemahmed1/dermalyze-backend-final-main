require("dotenv").config();
const { sequelize } = require('../config/db');

(async () => {
  try {
    // 1. Get all tables in the database
    const [tablesResult] = await sequelize.query("SHOW TABLES");
    const dbName = sequelize.config.database;
    const key = `Tables_in_${dbName}`;
    const tables = tablesResult.map(row => row[key] || Object.values(row)[0]);

    console.log("Found tables in database:", tables);

    for (const table of tables) {
      console.log(`\nChecking table: ${table}`);
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);

      // Group indexes by Column_name to find duplicates
      const uniqueColumnIndexes = {};
      const dropQueries = [];

      indexes.forEach(idx => {
        const keyName = idx.Key_name;
        const columnName = idx.Column_name;
        const isUnique = idx.Non_unique === 0;

        // Skip PRIMARY keys and foreign keys (which are typically non-unique)
        if (keyName === 'PRIMARY') return;

        // We only care about duplicate unique constraints causing the issue
        if (isUnique) {
          if (!uniqueColumnIndexes[columnName]) {
            uniqueColumnIndexes[columnName] = [];
          }
          uniqueColumnIndexes[columnName].push(keyName);
        }
      });

      for (const [columnName, keys] of Object.entries(uniqueColumnIndexes)) {
        if (keys.length > 1) {
          console.log(`  Column [${columnName}] has ${keys.length} unique indexes:`, keys);
          
          // Determine the "primary" key name to keep (usually the column name itself, e.g., 'email' or 'doctorCode')
          // If the column name itself isn't one of the keys, keep the first one
          let keyToKeep = keys.find(k => k === columnName) || keys[0];
          
          console.log(`  -> Keeping key: "${keyToKeep}"`);

          const keysToDrop = keys.filter(k => k !== keyToKeep);
          for (const keyToDrop of keysToDrop) {
            dropQueries.push(`ALTER TABLE \`${table}\` DROP INDEX \`${keyToDrop}\``);
          }
        }
      }

      if (dropQueries.length > 0) {
        console.log(`  Executing ${dropQueries.length} DROP INDEX queries for table \`${table}\`...`);
        for (const query of dropQueries) {
          console.log(`    Running: ${query}`);
          await sequelize.query(query);
        }
        console.log(`  ✅ Successfully dropped duplicate indexes on \`${table}\`.`);
      } else {
        console.log(`  No duplicate indexes found on \`${table}\`.`);
      }
    }

    console.log("\n🎉 Database index cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error running index cleanup:", error);
  } finally {
    await sequelize.close();
  }
})();
