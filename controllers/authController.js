const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const cloudinary = require("../config/cloudinary");
const { sendAdminNewDoctorAlert } = require("../services/emailService");
const { Op } = require("sequelize");

// Upload image buffer to Cloudinary
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, transformation: [{ width: 1024, height: 1024, crop: "limit" }] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, doctorCode } = req.body;

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

    // 👤 Patient
    else {
      let doctor = null;
      if (doctorCode) {
        doctor = await User.findOne({ where: { doctorCode, role: "doctor" } });
        if (!doctor) {
          return res.status(400).json({ message: "Invalid doctor code. Please ask your doctor for the correct code." });
        }
      }

      user = await User.create({
        name,
        email,
        password,
        role: "patient",
        doctorId: doctor ? doctor.id : null,
        phone: req.body.phone || "",
        nationalId: req.body.nationalId || "",
        dateOfBirth: req.body.dateOfBirth || "",
        diagnosis: req.body.diagnosis || null,
        allergies: req.body.allergies || null
      });

      if (doctor) {
        if (typeof doctor.addPatient === 'function') {
          await doctor.addPatient(user);
        }
      }
    }

    const token = generateToken(user.id, user.role);

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
        allergies: user.allergies || null
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password using model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = generateToken(user.id, user.role);

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
        allergies: user.allergies || null
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};