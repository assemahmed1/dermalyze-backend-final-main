const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, doctorCode } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // User.create will now handle password hashing via pre-save hook

    let user;

    // 👨‍⚕️ Doctor
    if (role === "doctor") {
      user = await User.create({
        name,
        email,
        password,
        role: "doctor"
      });
    }

    // 👤 Patient
    else {
      // Doctor code is required for patient registration
      if (!doctorCode) {
        return res.status(400).json({ message: "Doctor code is required to register as a patient" });
      }

      const doctor = await User.findOne({ doctorCode, role: "doctor" });
      if (!doctor) {
        return res.status(400).json({ message: "Invalid doctor code. Please ask your doctor for the correct code." });
      }

      user = await User.create({
        name,
        email,
        password,
        role: "patient",
        doctor: doctor._id
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorCode: user.doctorCode || null
      }
    });

  } catch (error) {
    console.error(`[REGISTRATION ERROR] ${error.stack || error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password using model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorCode: user.doctorCode || null
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};