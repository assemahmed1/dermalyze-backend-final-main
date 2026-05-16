const User = require("../models/User");
const { sendDoctorVerificationResult } = require("../services/emailService");

// ================= VERIFY DOCTOR =================
exports.verifyDoctor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }

    const doctor = await User.findByPk(userId);
    if (!doctor) return res.status(404).json({ message: "User not found" });
    if (doctor.role !== "doctor") return res.status(400).json({ message: "User is not a doctor" });

    doctor.verificationStatus = status;
    doctor.verificationNote = status === "rejected" ? (note || null) : null;
    await doctor.save({ hooks: false });

    sendDoctorVerificationResult(doctor.email, status, note).catch((err) => {
      console.error(`[DOCTOR VERIFICATION EMAIL ERROR] ${err.message}`);
    });

    res.json({
      message: `Doctor ${status === "verified" ? "approved" : "rejected"} successfully`,
      doctor: {
        _id: doctor.id, name: doctor.name, email: doctor.email,
        verificationStatus: doctor.verificationStatus, verificationNote: doctor.verificationNote
      }
    });
  } catch (error) {
    console.error(`[VERIFY DOCTOR ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// ================= GET PENDING DOCTORS =================
exports.getPendingDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor", verificationStatus: "pending" },
      attributes: ["id", "name", "email", "idCardFront", "idCardBack", "selfie", "verificationStatus", "createdAt"],
    });
    res.json({ count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET ALL DOCTORS =================
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: ["id", "name", "email", "idCardFront", "idCardBack", "selfie", "verificationStatus", "verificationNote", "createdAt"],
    });
    res.json({ count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
