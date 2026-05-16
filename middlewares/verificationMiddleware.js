const User = require("../models/User");

/**
 * Middleware to check if a doctor's account has been verified by an admin.
 * Must be placed AFTER authMiddleware (requires req.user to be set).
 * 
 * - Patients and admins pass through immediately.
 * - Doctors must have verificationStatus === "verified" to proceed.
 */
const requireVerifiedDoctor = async (req, res, next) => {
  try {
    // Only check doctors — patients and admins are always allowed
    if (req.user.role !== "doctor") {
      return next();
    }

    const user = await User.findById(req.user.id).select("verificationStatus");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationStatus !== "verified") {
      return res.status(403).json({
        message: "Your account is pending admin verification",
        verificationStatus: user.verificationStatus
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: "Verification check failed" });
  }
};

module.exports = requireVerifiedDoctor;
