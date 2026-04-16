const Medication = require("../models/Medication");
const Patient = require("../models/Patient");

// ✅ Doctor adds medication to patient
exports.addMedication = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { name, dosage, frequency, notes } = req.body;

    // IDOR Fix: verify patient belongs to this doctor
    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const medication = await Medication.create({
      patient: patientId,
      doctor: req.user.id,
      name,
      dosage,
      frequency,
      notes,
    });

    res.status(201).json({ message: "Medication added", medication });
  } catch (error) {
    next(error);
  }
};

// ✅ Get patient medications
exports.getPatientMedications = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // IDOR Fix: verify patient belongs to this doctor before returning medications
    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const medications = await Medication.find({ patient: patientId }).sort({ createdAt: -1 });

    res.json(medications);
  } catch (error) {
    next(error);
  }
};

// ✅ Update medication (whitelist + ownership check)
exports.updateMedication = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Mass Assignment Fix: only allow specific fields to be updated
    const { name, dosage, frequency, notes, isActive } = req.body;

    const allowedUpdate = {};
    if (name !== undefined) allowedUpdate.name = name;
    if (dosage !== undefined) allowedUpdate.dosage = dosage;
    if (frequency !== undefined) allowedUpdate.frequency = frequency;
    if (notes !== undefined) allowedUpdate.notes = notes;
    if (isActive !== undefined) allowedUpdate.isActive = isActive;

    const medication = await Medication.findOneAndUpdate(
      { _id: id, doctor: req.user.id },
      allowedUpdate,
      { returnDocument: "after", runValidators: true }
    );

    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.json({ message: "Medication updated", medication });
  } catch (error) {
    next(error);
  }
};

// ✅ Delete medication (ownership check)
exports.deleteMedication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const medication = await Medication.findOneAndDelete({
      _id: id,
      doctor: req.user.id,
    });

    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.json({ message: "Medication deleted" });
  } catch (error) {
    next(error);
  }
};
