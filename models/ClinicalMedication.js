const mongoose = require("mongoose");

const clinicalMedicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    uses: [{ type: String }],
    sideEffects: [{ type: String }],
    dosage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search index
clinicalMedicationSchema.index({ name: "text", category: "text" });

module.exports = mongoose.model("ClinicalMedication", clinicalMedicationSchema);
