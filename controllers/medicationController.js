const Medication = require("../models/Medication");
const Patient = require("../models/Patient");
const { getOrCreatePatient } = require("../utils/patientUtils");

exports.addMedication = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { name, dosage, frequency, notes } = req.body;
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const medication = await Medication.create({ patientId: patient.id, doctorId: req.user.id, name, dosage, frequency, notes });

    // Auto-link to ClinicalMedications by name fuzzy match
    try {
      const ClinicalMedication = require('../models/ClinicalMedication');
      const { Op } = require('sequelize');
      
      const clinicalMatch = await ClinicalMedication.findOne({
        where: {
          name: { [Op.like]: `%${medication.name}%` }
        }
      });

      if (clinicalMatch) {
        await medication.update({ clinicalMedicationId: clinicalMatch.id });
        console.log(`[MEDICATION LINK] "${medication.name}" linked to ClinicalMedication id=${clinicalMatch.id}`);
      } else {
        console.log(`[MEDICATION LINK] "${medication.name}" not found in ClinicalMedications — saved as free text`);
      }
    } catch (linkErr) {
      console.error('[MEDICATION LINK ERROR]', linkErr.message);
    }

    res.status(201).json({ message: "Medication added", medication });

    // --- Smart History fire-and-forget ---
    (async () => {
      try {
        const SmartImprovementRate = require("../models/SmartImprovementRate");
        const SmartTreatment = require("../models/SmartTreatment");
        const recoveryProgress = patient.recoveryProgress || 0;
        const rate = Math.max(1, Math.min(5, Math.ceil((recoveryProgress / 100) * 5) || 1));
        
        // Find or create smart_patients entry just in case
        const { sequelize } = require("../config/db");
        await sequelize.query(`INSERT IGNORE INTO smart_patients (patient_id, first_name, last_name) VALUES (${patient.id}, '${patient.name.split(' ')[0] || patient.name}', '${patient.name.split(' ').slice(1).join(' ') || ''}')`);
        
        // Find or create smart_treatments entry
        const [smartTreatment] = await SmartTreatment.findOrCreate({
          where: { name: medication.name },
          defaults: {
            name: medication.name,
            dosage: medication.dosage || '',
            usage: medication.frequency || '',
            clinicalMedicationId: medication.clinicalMedicationId || null
          }
        });
        
        let treatmentId = smartTreatment.treatment_id;

        await SmartImprovementRate.create({
          patient_id: patient.id,
          treatment_id: treatmentId,
          doctor_id: req.user.id,
          rate: rate,
          status: "active",
          date: new Date()
        });
      } catch (err) {
        console.error("Smart History Error:", err);
      }
    })();
  } catch (error) { next(error); }
};

exports.getPatientMedications = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const medications = await Medication.findAll({ where: { patientId: patient.id }, order: [["createdAt", "DESC"]] });
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
    const deleted = await Medication.destroy({ where: { id } });
    if (deleted === 0) return res.status(404).json({ success: false, message: "Medication not found" });
    res.status(200).json({ success: true, message: "Medication deleted successfully" });
  } catch (error) { next(error); }
};

// GET /api/patient/my-medications
exports.getMyMedications = async (req, res, next) => {
  try {
    // 1. Get the patient record for the logged-in user
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) return res.json([]); // return empty array if no clinical record yet
    
    // 2. Fetch their medications
    const medications = await Medication.findAll({ 
      where: { patientId: patient.id }, 
      order: [["createdAt", "DESC"]] 
    });
    
    res.json(medications);
  } catch (error) { next(error); }
};
