const mongoose = require("mongoose");

const clinicalDiseaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    symptoms: [{ type: String }],
    treatments: [{ type: String }],
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search index
clinicalDiseaseSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("ClinicalDisease", clinicalDiseaseSchema);
