const User = require("../models/User");
const { sendDoctorVerificationResult } = require("../services/emailService");

// ================= VERIFY DOCTOR =================
/**
 * Admin approves or rejects a doctor's ID card verification.
 * Updates verificationStatus and sends email notification to the doctor.
 */
exports.verifyDoctor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note } = req.body;

    // Validate status value
    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'verified' or 'rejected'"
      });
    }

    // Find the doctor
    const doctor = await User.findById(userId);
    if (!doctor) {
      return res.status(404).json({ message: "User not found" });
    }

    if (doctor.role !== "doctor") {
      return res.status(400).json({ message: "User is not a doctor" });
    }

    // Update verification fields
    doctor.verificationStatus = status;
    doctor.verificationNote = status === "rejected" ? (note || null) : null;
    await doctor.save();

    // Send email notification to the doctor (fire & forget)
    sendDoctorVerificationResult(doctor.email, status, note).catch((err) => {
      console.error(`[DOCTOR VERIFICATION EMAIL ERROR] ${err.message}`);
    });

    res.json({
      message: `Doctor ${status === "verified" ? "approved" : "rejected"} successfully`,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        verificationStatus: doctor.verificationStatus,
        verificationNote: doctor.verificationNote
      }
    });

  } catch (error) {
    console.error(`[VERIFY DOCTOR ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// ================= GET PENDING DOCTORS =================
/**
 * Lists all doctors whose verificationStatus is "pending".
 */
exports.getPendingDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      role: "doctor",
      verificationStatus: "pending"
    }).select("name email idCardFront idCardBack selfie verificationStatus createdAt");

    res.json({ count: doctors.length, doctors });
  } catch (error) {
    console.error(`[GET PENDING DOCTORS ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// ================= GET ALL DOCTORS =================
/**
 * Lists all doctors with their verification status.
 */
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("name email idCardFront idCardBack selfie verificationStatus verificationNote createdAt");

    res.json({ count: doctors.length, doctors });
  } catch (error) {
    console.error(`[GET ALL DOCTORS ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};
