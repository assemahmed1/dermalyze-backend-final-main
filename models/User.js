const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");

// Generate unique doctor code
function generateDoctorCode() {
  return "DOC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("doctor", "patient", "admin"),
      defaultValue: "patient",
    },
    doctorCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    doctorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "Users", key: "id" },
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    nationalId: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    dateOfBirth: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    diagnosis: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    allergies: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    isCritical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    fcmToken: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    notificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Notification Preferences
    pushNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
    emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
    smsNotifications: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Two-Factor Authentication
    twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    twoFactorSecret: { type: DataTypes.STRING, defaultValue: null },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resetPasswordOTP: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    resetPasswordOTPExpires: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    // Doctor ID Card Verification
    idCardFront: {
      type: DataTypes.STRING(1024),
      defaultValue: null,
    },
    idCardBack: {
      type: DataTypes.STRING(1024),
      defaultValue: null,
    },
    selfie: {
      type: DataTypes.STRING(1024),
      defaultValue: null,
    },
    verificationStatus: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      defaultValue: "pending",
    },
    verificationNote: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    tableName: "Users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        // Hash password
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
        // Generate doctor code
        if (user.role === "doctor" && !user.doctorCode) {
          user.doctorCode = generateDoctorCode();
        }
        // Auto-set verificationStatus
        if (user.role === "doctor") {
          user.verificationStatus = user.verificationStatus || "pending";
        } else {
          user.verificationStatus = "verified";
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

/**
 * Convenience method to check password matches.
 */
User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;