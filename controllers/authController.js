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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    // 👨‍⚕️ Doctor
    if (role === "doctor") {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
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
        password: hashedPassword,
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

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
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