require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function cleanup() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI not found in environment");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for cleanup...");

    const patterns = [
      /^test_verification_.*@example\.com$/,
      /^test_fix_verify_.*@example\.com$/,
      /^test_doctor_prod_.*@example\.com$/
    ];

    const filter = {
      email: { $in: patterns }
    };

    const count = await User.countDocuments(filter);
    console.log(`Found ${count} test accounts to delete.`);

    if (count > 0) {
      const result = await User.deleteMany(filter);
      console.log(`Successfully deleted ${result.deletedCount} test accounts.`);
    } else {
      console.log("No matching test accounts found.");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exit(1);
  }
}

cleanup();
