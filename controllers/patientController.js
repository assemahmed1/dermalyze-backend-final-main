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
      doctorId: req.user.id,
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPatients = async (req, res, next) => {
  try {
    const patients = await Patient.findAll({
      where: { doctorId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(patients);
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    // IDOR Fix: scope lookup to both ID and doctor
    const patient = await Patient.findOne({
      where: {
        id: req.params.id,
        doctorId: req.user.id,
      },
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
    const [affectedRows] = await Patient.update(
      { status },
      { where: { id: req.params.id, doctorId: req.user.id } }
    );

    if (affectedRows === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = await Patient.findByPk(req.params.id);
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
    const [affectedRows] = await Patient.update(
      { recoveryProgress: progress },
      { where: { id: req.params.id, doctorId: req.user.id } }
    );

    if (affectedRows === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = await Patient.findByPk(req.params.id);
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