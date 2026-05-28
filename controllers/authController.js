const User = require("../models/User");
const Patient = require("../models/Patient");
const bcrypt = require("bcryptjs");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const { uploadToCloudinary } = require("../utils/cloudinaryUtils");
const { sendAdminNewDoctorAlert } = require("../services/emailService");
const { Op } = require("sequelize");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    let user;

    // 👨‍⚕️ Doctor
    if (role === "doctor") {
      // Validate all 3 images are provided
      const files = req.files || {};
      if (!files.idCardFront || !files.idCardBack || !files.selfie) {
        return res.status(400).json({ message: "ID card front, back, and selfie are all required for doctor registration" });
      }

      // Upload all 3 images to Cloudinary simultaneously
      const [frontResult, backResult, selfieResult] = await Promise.all([
        uploadToCloudinary(files.idCardFront[0].buffer, "dermalyze/doctor-ids"),
        uploadToCloudinary(files.idCardBack[0].buffer, "dermalyze/doctor-ids"),
        uploadToCloudinary(files.selfie[0].buffer, "dermalyze/doctor-ids"),
      ]);

      user = await User.create({
        name,
        email,
        password,
        role: "doctor",
        idCardFront: frontResult.secure_url,
        idCardBack: backResult.secure_url,
        selfie: selfieResult.secure_url,
        verificationStatus: "pending"
      });

      // Notify admin of new doctor registration (fire & forget)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        sendAdminNewDoctorAlert(adminEmail, name, frontResult.secure_url, backResult.secure_url, selfieResult.secure_url).catch((err) => {
          console.error(`[ADMIN EMAIL ERROR] ${err.message}`);
        });
      }
    }

    // 👤 Patient accounts are created by doctors via the magic link flow.
    // Direct self-registration is not supported for patients.
    else {
      return res.status(400).json({
        message: "Patient accounts are created by your doctor. Please ask your doctor to create your account."
      });
    }

    const token = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    let patientData = {};
    if (user.role === "patient") {
      const Patient = require("../models/Patient");
      const clinical = await Patient.findOne({ where: { userId: user.id } });
      if (clinical) {
        patientData = {
          nextAppointment: clinical.nextAppointment,
          lastVisit: clinical.lastVisit,
          recoveryProgress: clinical.recoveryProgress,
          status: clinical.status
        };
      }
    }

    res.status(201).json({
      message: "Success",
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        nationalId: user.nationalId || "",
        dateOfBirth: user.dateOfBirth || "",
        doctorCode: user.doctorCode || "",
        doctorId: user.doctorId ? user.doctorId.toString() : "",
        diagnosis: user.diagnosis || null,
        allergies: user.allergies || null,
        specialization: user.specialization || null,
        licenseNumber: user.licenseNumber || null,
        experience: user.experience || null,
        ...patientData
      }
    });

  } catch (error) {
    console.error(`[REGISTRATION ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({ message: "If this email is registered, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiry (10 mins)
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ hooks: false }); // skip password re-hashing

    // Send Email
    const { sendOTPEmail } = require("../services/emailService");
    await sendOTPEmail(user.email, otp);

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error(`[FORGOT PASSWORD ERROR] ${error.message}`);
    res.status(500).json({ message: "Failed to send OTP. Please try again later." });
  }
};

// ================= VERIFY OTP =================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      where: {
        email,
        resetPasswordOTP: code,
        resetPasswordOTPExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        email,
        resetPasswordOTP: code,
        resetPasswordOTPExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Update password — beforeUpdate hook will hash it
    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now login with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password using model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Block patients who haven't activated their account yet
    if (user.status === "pending_activation") {
      return res.status(403).json({
        message: "Please activate your account via the WhatsApp link sent to your phone"
      });
    }

    // Block pending or rejected doctors from logging in
    if (user.role === "doctor") {
      if (user.verificationStatus === "pending") {
        return res.status(403).json({ message: "Your account is pending administrator verification." });
      }
      if (user.verificationStatus === "rejected") {
        return res.status(403).json({ 
          message: "Your professional credentials verification request has been rejected.",
          note: user.verificationNote
        });
      }
    }

    const token = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    let patientData = {};
    if (user.role === "patient") {
      const Patient = require("../models/Patient");
      const clinical = await Patient.findOne({ where: { userId: user.id } });
      if (clinical) {
        patientData = {
          nextAppointment: clinical.nextAppointment,
          lastVisit: clinical.lastVisit,
          recoveryProgress: clinical.recoveryProgress,
          status: clinical.status
        };
      }
    }

    res.json({
      message: "Success",
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        nationalId: user.nationalId || "",
        dateOfBirth: user.dateOfBirth || "",
        doctorCode: user.doctorCode || "",
        doctorId: user.doctorId ? user.doctorId.toString() : "",
        diagnosis: user.diagnosis || null,
        allergies: user.allergies || null,
        specialization: user.specialization || null,
        licenseNumber: user.licenseNumber || null,
        experience: user.experience || null,
        ...patientData
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= REFRESH =================
exports.refresh = async (req, res) => {
  try {
    let refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers["x-refresh-token"];

    if (!refreshToken && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      refreshToken = req.headers.authorization.split(" ")[1];
    }

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token not found" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    res.json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ACTIVATE ACCOUNT (Magic Link) =================
exports.activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    // Verify the magic link JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired activation link. Please ask your doctor to resend the link." });
    }

    if (decoded.purpose !== "account_activation") {
      return res.status(400).json({ success: false, message: "Invalid token purpose" });
    }

    // Find the user account
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.status !== "pending_activation") {
      return res.status(400).json({ success: false, message: "This account has already been activated" });
    }

    // Set the patient's real password — beforeUpdate hook will hash it automatically
    user.password = password;
    user.status = "active";
    await user.save();

    // Link the Patient clinical record to this user
    if (decoded.patientId) {
      await Patient.update(
        { userId: user.id },
        { where: { id: decoded.patientId } }
      );
    }

    // Return a full access token so the patient is immediately logged in
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Fetch the linked clinical patient record for the response payload
    const clinical = decoded.patientId
      ? await Patient.findByPk(decoded.patientId)
      : null;

    res.json({
      success: true,
      message: "Account activated successfully",
      token: accessToken,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        nationalId: user.nationalId || "",
        dateOfBirth: user.dateOfBirth || "",
        doctorId: user.doctorId ? user.doctorId.toString() : "",
        diagnosis: user.diagnosis || null,
        allergies: user.allergies || null,
        ...(clinical ? {
          nextAppointment: clinical.nextAppointment,
          lastVisit: clinical.lastVisit,
          recoveryProgress: clinical.recoveryProgress,
          status: clinical.status
        } : {})
      }
    });
  } catch (error) {
    console.error(`[ACTIVATE ACCOUNT ERROR] ${error.stack || error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};