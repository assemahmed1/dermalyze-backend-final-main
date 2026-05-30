require('dotenv').config();
const { sequelize } = require('../config/db');

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database. Modifying schema...");

    // 1. Add status to Messages
    try {
      await sequelize.query("ALTER TABLE Messages ADD COLUMN status ENUM('sent', 'delivered', 'read') DEFAULT 'sent'");
      console.log("✅ Added 'status' to Messages");
    } catch (e) {
      if (e.message.includes("Duplicate column name")) console.log("⏭️ 'status' already exists in Messages");
      else console.error("❌ Error adding 'status':", e.message);
    }

    // 2. Add reaction to Messages
    try {
      await sequelize.query("ALTER TABLE Messages ADD COLUMN reaction VARCHAR(255) DEFAULT NULL");
      console.log("✅ Added 'reaction' to Messages");
    } catch (e) {
      if (e.message.includes("Duplicate column name")) console.log("⏭️ 'reaction' already exists in Messages");
      else console.error("❌ Error adding 'reaction':", e.message);
    }

    // 3. Add lastSeen to Users
    try {
      await sequelize.query("ALTER TABLE Users ADD COLUMN lastSeen DATETIME DEFAULT NULL");
      console.log("✅ Added 'lastSeen' to Users");
    } catch (e) {
      if (e.message.includes("Duplicate column name")) console.log("⏭️ 'lastSeen' already exists in Users");
      else console.error("❌ Error adding 'lastSeen':", e.message);
    }

    console.log("Schema modification complete.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to connect or modify schema:", err);
    process.exit(1);
  }
}

run();
