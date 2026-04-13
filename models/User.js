const mongoose = require("mongoose");

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
    enum: ["doctor", "patient"],
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
  }
});

// Auto-generate doctor code before save
userSchema.pre("save", function () {
  if (this.role === "doctor" && !this.doctorCode) {
    this.doctorCode = generateDoctorCode();
  }
});

module.exports = mongoose.model("User", userSchema);