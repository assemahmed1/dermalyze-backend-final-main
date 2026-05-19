const Patient = require("../models/Patient");
const { getOrCreatePatient } = require("../utils/patientUtils");

const createPatient = async (req, res) => {
  try {
    const { name, age, gender, diagnosis, nationalId, phone, address, medicalHistory } = req.body;

    if (!name || !age || !gender) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const patient = await Patient.create({
      name, age, gender, diagnosis,
      nationalId, phone, address, medicalHistory,
      doctorId: req.user.id,
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows: patients, count } = await Patient.findAndCountAll({
      where: { doctorId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      data: patients,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patient = await getOrCreatePatient(req.params.id, req.user.id);
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

    const patient = await getOrCreatePatient(req.params.id, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.status = status;
    await patient.save();

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

    const patient = await getOrCreatePatient(req.params.id, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.recoveryProgress = progress;
    await patient.save();

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