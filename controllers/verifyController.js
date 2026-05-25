/**
 * Verify Identity — Manual Review
 *
 * Doctor identity verification is handled manually by an admin
 * through the Admin Panel (not automated Python scripts).
 * Doctors upload their ID during registration and an admin
 * reviews and approves/rejects via the admin dashboard.
 */
exports.verifyIdentity = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Doctor identity verification is handled manually by the admin team. You will receive an email once your account is reviewed.",
    verificationStatus: "pending"
  });
};
