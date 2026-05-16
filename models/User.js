const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Generate unique doctor code
function generateDoctorCode() {
  return "DOC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["doctor", "patient", "admin"],
    default: "patient"
  },

  doctorCode: {
    type: String,
    unique: true,
    sparse: true
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  fcmToken: {
    type: String,
    default: null
  },

  notificationsEnabled: {
    type: Boolean,
    default: true
  },

  // ✅ Notification Preferences
  pushNotifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },

  // ✅ Two-Factor Authentication
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },

  isOnline: {
    type: Boolean,
    default: false
  },

  resetPasswordOTP: {
    type: String,
    default: null
  },

  resetPasswordOTPExpires: {
    type: Date,
    default: null
  },

  // ✅ Doctor ID Card Verification
  idCardImage: {
    type: String,
    default: null
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },

  verificationNote: {
    type: String,
    default: null
  }
});

/**
 * Unified pre-save hook for password hashing and doctor code generation.
 * NOTE: Modern Mongoose async hooks should not use 'next' to avoid 
 * "next is not a function" errors.
 */
userSchema.pre("save", async function () {
  // 1. Handle Password Hashing
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // 2. Handle Doctor Code Generation
  if (this.role === "doctor" && !this.doctorCode) {
    this.doctorCode = generateDoctorCode();
  }

  // 3. Auto-set verificationStatus based on role
  if (this.isNew) {
    if (this.role === "doctor") {
      this.verificationStatus = this.verificationStatus || "pending";
    } else {
      this.verificationStatus = "verified";
    }
  }
});

/**
 * Convenience method to check password matches.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);