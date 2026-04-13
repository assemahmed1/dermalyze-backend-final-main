const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: { type: String, required: true },

    dosage: { type: String, required: true }, // e.g. "1 tablet", "Apply twice daily"

    frequency: { type: String, required: true }, // e.g. "Morning & Evening"

    isActive: { type: Boolean, default: true },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medication", medicationSchema);
