const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },

    // ✅ Additional fields
    nationalId: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    medicalHistory: { type: String, default: "" },

    diagnosis: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Improving", "Stable", "Critical"],
      default: "Stable",
    },

    // ✅ Recovery Progress
    recoveryProgress: { type: Number, default: 0, min: 0, max: 100 },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    images: [
      {
        url: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);