const Patient = require("../models/Patient");

const createPatient = async (req, res) => {
  try {
    const { name, age, gender, diagnosis, nationalId, phone, address, medicalHistory } = req.body;

    if (!name || !age || !gender) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const patient = await Patient.create({
      name, age, gender, diagnosis,
      nationalId, phone, address, medicalHistory,
      doctor: req.user.id,
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id }).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    // IDOR Fix: scope lookup to both ID and doctor
    const patient = await Patient.findOne({
      _id: req.params.id,
      doctor: req.user.id,
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (error) {
    next(error);
  }
};

const updatePatientStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Improving", "Stable", "Critical"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // IDOR Fix: ensure patient belongs to this doctor
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user.id },
      { status: status },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

// ✅ Update Recovery Progress
const updateRecoveryProgress = async (req, res, next) => {
  try {
    const { progress } = req.body;

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Progress must be between 0 and 100" });
    }

    // IDOR Fix: ensure patient belongs to this doctor
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user.id },
      { recoveryProgress: progress },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    res.json({ message: "Recovery progress updated", patient });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatientStatus,
  updateRecoveryProgress,
};