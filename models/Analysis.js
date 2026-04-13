const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  imageUrl: {
    type: String,
    required: true
  },

  result: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model("Analysis", analysisSchema);