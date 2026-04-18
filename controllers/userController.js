const User = require("../models/User");
const Patient = require("../models/Patient");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Appointment = require("../models/Appointment");
const Analysis = require("../models/Analysis");
const Medication = require("../models/Medication");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// @desc    Update notification preferences
// @route   PUT /api/user/notification-preferences
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const { pushNotifications, emailNotifications, smsNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        pushNotifications,
        emailNotifications,
        smsNotifications,
      },
      { new: true }
    );

    res.json({
      message: "Notification preferences updated successfully",
      preferences: {
        pushNotifications: user.pushNotifications,
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable 2FA (Generate secret and QR code)
// @route   POST /api/user/2fa/enable
exports.enable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Dermalyze (${user.email})`,
    });

    // Save temporary secret (before verification)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      message: "2FA generation successful. Verify with OTP to activate.",
      qrCode: qrCodeUrl,
      secret: secret.base32, // Provide secret for manual entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA to activate
// @route   POST /api/user/2fa/verify
exports.verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!token) {
      return res.status(400).json({ message: "OTP token is required" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
      res.json({ message: "2FA activated successfully" });
    } else {
      res.status(400).json({ message: "Invalid OTP token" });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Disable 2FA
// @route   POST /api/user/2fa/disable
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account and all related data (Cascading Deletion)
// @route   DELETE /api/user/account
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Permanently delete all related records
    await Promise.all([
      Patient.deleteMany({ doctor: userId }),
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      Notification.deleteMany({ doctorId: userId }),
      Appointment.deleteMany({ doctorId: userId }),
      Analysis.deleteMany({ doctor: userId }),
      Medication.deleteMany({ doctor: userId }),
    ]);

    // 2. Delete the user itself
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account and all associated clinical data deleted permanently" });
  } catch (error) {
    next(error);
  }
};
