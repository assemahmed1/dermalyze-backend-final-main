const { Op } = require("sequelize");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Appointment = require("../models/Appointment");
const Analysis = require("../models/Analysis");
const Medication = require("../models/Medication");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// @desc    Get current user profile (Doctor/Patient)
// @route   GET /api/user/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password", "resetPasswordOTP", "resetPasswordOTPExpires", "twoFactorSecret"] }
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profileData = user.toJSON();
    
    // If it's a patient, get their clinical details
    if (user.role === "patient") {
      const patientClinical = await Patient.findOne({ where: { userId: user.id } });
      if (patientClinical) {
        // Fetch the latest analysis to get the "improvement" string if available
        const latestAnalysis = await Analysis.findOne({
          where: { patientId: patientClinical.id },
          order: [["createdAt", "DESC"]]
        });

        let parsedRecovery = patientClinical.recoveryProgress || 0;
        let improvementStr = "+0%";

        if (latestAnalysis && latestAnalysis.improvement) {
          const rawImprovement = latestAnalysis.improvement;
          const match = rawImprovement.match(/([+-]?\d+(\.\d+)?)/);
          if (match) {
            // Format improvement string as just "+65.0%"
            improvementStr = (parseFloat(match[1]) >= 0 ? "+" : "") + match[1] + "%";
          }
        }

        // Add both standard and alternative keys expected by the Flutter app
        profileData.diagnosis = patientClinical.diagnosis || user.diagnosis || "Unknown";
        profileData.currentDiagnosis = profileData.diagnosis;
        profileData.quality = patientClinical.status || "Low";
        profileData.recoveryQuality = profileData.quality;
        profileData.recoveryProgress = parsedRecovery;
        profileData.recoveryRate = parsedRecovery; // Alternative key
        profileData.recovery = parsedRecovery;     // Alternative key
        profileData.improvement = improvementStr;
        profileData.lastVisit = patientClinical.lastVisit || "";
        profileData.lastCheckup = profileData.lastVisit;
        profileData.nextVisit = patientClinical.nextAppointment || "";
        profileData.nextAppointment = profileData.nextVisit;
        profileData.daysInTreatment = Math.floor((Date.now() - new Date(patientClinical.createdAt).getTime()) / (1000 * 3600 * 24)) || 14;
        profileData.treatmentDays = profileData.daysInTreatment;
        profileData.doctorCheckups = 3;
        profileData.checkupsCount = 3;
        profileData.medicationAdherence = 92;
        profileData.adherenceRate = 92;
        profileData.status = patientClinical.status;
      }
    }

    // The Flutter app expects specific keys, provide multiple wrappers to prevent parsing crashes
    res.json({ 
      success: true,
      profile: profileData,
      patient: profileData,
      user: profileData,
      data: profileData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/user/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, nationalId, dateOfBirth, allergies } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.phone = phone !== undefined ? phone : user.phone;
    user.nationalId = nationalId !== undefined ? nationalId : user.nationalId;
    user.dateOfBirth = dateOfBirth !== undefined ? dateOfBirth : user.dateOfBirth;
    user.allergies = allergies !== undefined ? allergies : user.allergies;
    
    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/user/notification-preferences
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const { pushNotifications, emailNotifications, smsNotifications, emailEnabled, pushEnabled } = req.body;
    
    // Support both Backend and Flutter app keys
    const finalPush = pushEnabled !== undefined ? pushEnabled : pushNotifications;
    const finalEmail = emailEnabled !== undefined ? emailEnabled : emailNotifications;

    await User.update(
      { 
        pushNotifications: finalPush, 
        emailNotifications: finalEmail, 
        smsNotifications 
      },
      { where: { id: req.user.id } }
    );
    const user = await User.findByPk(req.user.id);
    res.json({
      message: "Notification preferences updated successfully",
      preferences: {
        pushNotifications: user.pushNotifications,
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Enable 2FA
// @route   POST /api/user/2fa/enable
exports.enable2FA = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.twoFactorEnabled) return res.status(400).json({ message: "2FA is already enabled" });
    const secret = speakeasy.generateSecret({ name: `Dermalyze (${user.email})` });
    user.twoFactorSecret = secret.base32;
    await user.save({ hooks: false });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ message: "2FA generation successful. Verify with OTP to activate.", qrCode: qrCodeUrl, secret: secret.base32 });
  } catch (error) { next(error); }
};

// @desc    Verify 2FA
// @route   POST /api/user/2fa/verify
exports.verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!token) return res.status(400).json({ message: "OTP token is required" });
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: "base32", token });
    if (verified) {
      user.twoFactorEnabled = true;
      await user.save({ hooks: false });
      res.json({ message: "2FA activated successfully" });
    } else {
      res.status(400).json({ message: "Invalid OTP token" });
    }
  } catch (error) { next(error); }
};

// @desc    Disable 2FA
// @route   POST /api/user/2fa/disable
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save({ hooks: false });
    res.json({ message: "2FA disabled successfully" });
  } catch (error) { next(error); }
};

// @desc    Delete account and all related data (Cascading Deletion)
// @route   DELETE /api/user/account
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await Promise.all([
      Patient.destroy({ where: { doctorId: userId } }),
      Message.destroy({ where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] } }),
      Notification.destroy({ where: { doctorId: userId } }),
      Appointment.destroy({ where: { doctorId: userId } }),
      Analysis.destroy({ where: { doctorId: userId } }),
      Medication.destroy({ where: { doctorId: userId } }),
    ]);
    await User.destroy({ where: { id: userId } });
    res.json({ message: "Account and all associated clinical data deleted permanently" });
  } catch (error) { next(error); }
};

// @desc    Update FCM Token for Push Notifications
// @route   PUT /api/user/fcm-token
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    await User.update(
      { fcmToken },
      { where: { id: req.user.id } }
    );

    res.json({ message: "FCM Token updated successfully" });
  } catch (error) {
    next(error);
  }
};
