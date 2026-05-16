require("dotenv").config();
const { connectDB, sequelize } = require("../config/db");

// Load all models + associations
require("../models");

const User = require("../models/User");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dermalyze.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

async function createAdmin() {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`✅ Admin account already exists: ${ADMIN_EMAIL}`);
      } else {
        existing.role = "admin";
        existing.verificationStatus = "verified";
        await existing.save({ hooks: false });
        console.log(`🔄 Updated existing user to admin: ${ADMIN_EMAIL}`);
      }
    } else {
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        verificationStatus: "verified",
      });
      console.log(`🆕 Admin account created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("❌ Failed to create admin:", error.message);
  } finally {
    await sequelize.close();
    console.log("🔌 Disconnected from MySQL");
    process.exit(0);
  }
}

createAdmin();
