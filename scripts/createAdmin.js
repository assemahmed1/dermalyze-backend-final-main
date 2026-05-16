require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dermalyze.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

async function createAdmin() {
  try {
    await connectDB();

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`✅ Admin account already exists: ${ADMIN_EMAIL}`);
      } else {
        existing.role = "admin";
        existing.verificationStatus = "verified";
        await existing.save();
        console.log(`🔄 Updated existing user to admin: ${ADMIN_EMAIL} (was ${existing.role})`);
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
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

createAdmin();
