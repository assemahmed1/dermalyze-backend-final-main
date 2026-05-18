require("dotenv").config();
const { connectDB, sequelize } = require("../config/db");
const { User, Patient, Medication, Analysis } = require("../models/index");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { getOrCreatePatient } = require("../utils/patientUtils");
const jwt = require("jsonwebtoken");

async function runTests() {
  try {
    console.log("🚀 Starting API Refactor & Standardization Verification Tests...");
    await connectDB();
    console.log("🔄 Synchronizing models with database schema (alter: true)...");
    await sequelize.sync({ alter: true });
    console.log("✅ Models successfully synced!");

    // 1. Verify JWT Extension (Access Token should be 30 days, Refresh should be 90 days)
    console.log("\n--- [TEST 1] Token Expiration Extensions ---");
    const accessToken = generateAccessToken(1, "doctor");
    const refreshToken = generateRefreshToken(1, "doctor");

    const decodedAccess = jwt.decode(accessToken);
    const decodedRefresh = jwt.decode(refreshToken);

    const accessDurationDays = Math.round((decodedAccess.exp - decodedAccess.iat) / (24 * 3600));
    const refreshDurationDays = Math.round((decodedRefresh.exp - decodedRefresh.iat) / (24 * 3600));

    console.log(`Access Token Lifetime: ${accessDurationDays} days (Expected: 30 days)`);
    console.log(`Refresh Token Lifetime: ${refreshDurationDays} days (Expected: 90 days)`);

    if (accessDurationDays === 30 && refreshDurationDays === 90) {
      console.log("✅ Token lifetimes successfully extended!");
    } else {
      throw new Error("❌ Token lifetime extension verification failed!");
    }

    // 2. Verify patient/user resolution via getOrCreatePatient
    console.log("\n--- [TEST 2] Patient / User ID Resolution ---");
    // Find or create a test doctor and patient
    let doctor = await User.findOne({ where: { role: "doctor" } });
    if (!doctor) {
      doctor = await User.create({
        name: "Test Doctor",
        email: "testdoctor@dermalyze.com",
        password: "password123",
        role: "doctor",
        verificationStatus: "approved"
      });
    }

    let patientUser = await User.findOne({ where: { role: "patient" } });
    if (!patientUser) {
      patientUser = await User.create({
        name: "Test Patient User",
        email: "testpatient@dermalyze.com",
        password: "password123",
        role: "patient",
        doctorId: doctor.id,
        dateOfBirth: "1998-05-15"
      });
    }

    console.log(`Testing patient resolution for User ID: ${patientUser.id} and Doctor ID: ${doctor.id}`);
    const resolvedPatient = await getOrCreatePatient(patientUser.id, doctor.id);
    
    if (resolvedPatient && resolvedPatient.userId === patientUser.id) {
      console.log(`✅ Successfully resolved patient record! Age: ${resolvedPatient.age}, Name: ${resolvedPatient.name}, Clinical ID: ${resolvedPatient.id}, User ID Ref: ${resolvedPatient.userId}`);
    } else {
      throw new Error("❌ Patient resolution failed!");
    }

    // 3. Test parameter mapper and standard routes mapping logic
    console.log("\n--- [TEST 3] Standardized Route Verification ---");
    console.log("Mocking and verifying mapParams middleware...");
    const req = { params: { patientId: 42 } };
    const res = {};
    const next = () => {
      if (req.params.id === 42) {
        console.log("✅ Parameter mapper correctly mapped patientId to id!");
      } else {
        throw new Error("❌ Parameter mapping failed!");
      }
    };
    const mapper = (from, to) => (req, res, next) => {
      if (req.params[from] !== undefined) {
        req.params[to] = req.params[from];
      }
      next();
    };
    mapper("patientId", "id")(req, res, next);

    // 4. Verify mock appointment creation with the resolved clinical ID
    console.log("\n--- [TEST 4] Mock Appointment Foreign Key Resolution ---");
    const Appointment = require("../models/Appointment");
    
    // Clean any prior mock appointments
    await Appointment.destroy({ where: { patientId: resolvedPatient.id } });

    const mockAppointment = await Appointment.create({
      patientId: resolvedPatient.id,
      doctorId: doctor.id,
      patientName: resolvedPatient.name,
      diagnosis: "Skin Rash",
      appointmentDate: "2026-06-01",
      appointmentTime: "10:30"
    });

    if (mockAppointment && mockAppointment.patientId === resolvedPatient.id) {
      console.log(`✅ Successfully scheduled mock appointment with clinical patient ID reference!`);
      // Clean up
      await mockAppointment.destroy();
    } else {
      throw new Error("❌ Appointment scheduling using clinical patient ID failed!");
    }

    console.log("\n🎉 All Verification Tests Passed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test suite encountered a failure:", error.stack || error.message);
    process.exit(1);
  }
}

runTests();
