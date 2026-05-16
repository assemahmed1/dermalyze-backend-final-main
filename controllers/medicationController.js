const Medication = require("../models/Medication");
const Patient = require("../models/Patient");

exports.addMedication = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { name, dosage, frequency, notes } = req.body;
    const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const medication = await Medication.create({ patientId, doctorId: req.user.id, name, dosage, frequency, notes });
    res.status(201).json({ message: "Medication added", medication });
  } catch (error) { next(error); }
};

exports.getPatientMedications = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const medications = await Medication.findAll({ where: { patientId }, order: [["createdAt", "DESC"]] });
    res.json(medications);
  } catch (error) { next(error); }
};

exports.updateMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, dosage, frequency, notes, isActive } = req.body;
    const allowedUpdate = {};
    if (name !== undefined) allowedUpdate.name = name;
    if (dosage !== undefined) allowedUpdate.dosage = dosage;
    if (frequency !== undefined) allowedUpdate.frequency = frequency;
    if (notes !== undefined) allowedUpdate.notes = notes;
    if (isActive !== undefined) allowedUpdate.isActive = isActive;
    const [affectedRows] = await Medication.update(allowedUpdate, { where: { id, doctorId: req.user.id } });
    if (affectedRows === 0) return res.status(404).json({ message: "Medication not found" });
    const medication = await Medication.findByPk(id);
    res.json({ message: "Medication updated", medication });
  } catch (error) { next(error); }
};

exports.deleteMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Medication.destroy({ where: { id, doctorId: req.user.id } });
    if (deleted === 0) return res.status(404).json({ message: "Medication not found" });
    res.json({ message: "Medication deleted" });
  } catch (error) { next(error); }
};
