/**
 * models/index.js — Central model loader and association registry.
 * Import this file once (e.g. in server.js) to ensure all models
 * are registered and their relationships are set up before sync.
 */

const User = require("./User");
const Patient = require("./Patient");
const PatientImage = require("./PatientImage");
const PatientReview = require("./PatientReview");
const Analysis = require("./Analysis");
const Appointment = require("./Appointment");
const Medication = require("./Medication");
const Conversation = require("./Conversation");
const Message = require("./Message");
const Notification = require("./Notification");
const ClinicalMedication = require("./ClinicalMedication");
const Disease = require("./Disease");
const DiseaseReport = require("./DiseaseReport");
const SmartPatient = require("./SmartPatient");
const SmartDoctor = require("./SmartDoctor");
const SmartTreatment = require("./SmartTreatment");
const SmartPatientDisease = require("./SmartPatientDisease");
const SmartImprovementRate = require("./SmartImprovementRate");
const SmartDoctorTreatment = require("./SmartDoctorTreatment");

// ========================
// Associations
// ========================

// User self-reference (patient → doctor)
User.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });
User.hasMany(User, { as: "patients", foreignKey: "doctorId" });

// Disease & DiseaseReport relationships
Disease.hasOne(DiseaseReport, { foreignKey: "diseaseId", as: "report", onDelete: "CASCADE" });
DiseaseReport.belongsTo(Disease, { foreignKey: "diseaseId", as: "disease" });

// Patient & DiseaseReport relationship
Patient.hasMany(DiseaseReport, { foreignKey: "patientId", as: "reports", onDelete: "CASCADE" });
DiseaseReport.belongsTo(Patient, { foreignKey: "patientId", as: "patient" });

// Smart History relationships — disease_id now points to unified Diseases table
SmartPatient.belongsToMany(Disease, {
  through: SmartPatientDisease,
  foreignKey: "patient_id",
  otherKey: "disease_id",
  as: "diseases"
});
Disease.belongsToMany(SmartPatient, {
  through: SmartPatientDisease,
  foreignKey: "disease_id",
  otherKey: "patient_id",
  as: "smartPatients"
});

SmartPatient.hasMany(SmartImprovementRate, { foreignKey: "patient_id", as: "improvementRates" });
SmartImprovementRate.belongsTo(SmartPatient, { foreignKey: "patient_id", as: "patient" });

SmartDoctor.hasMany(SmartImprovementRate, { foreignKey: "doctor_id", as: "improvementRates" });
SmartImprovementRate.belongsTo(SmartDoctor, { foreignKey: "doctor_id", as: "doctor" });

SmartTreatment.hasMany(SmartImprovementRate, { foreignKey: "treatment_id", as: "improvementRates" });
SmartImprovementRate.belongsTo(SmartTreatment, { foreignKey: "treatment_id", as: "treatment" });

SmartDoctor.belongsToMany(SmartTreatment, {
  through: SmartDoctorTreatment,
  foreignKey: "doctor_id",
  otherKey: "treatment_id",
  as: "treatments"
});
SmartTreatment.belongsToMany(SmartDoctor, {
  through: SmartDoctorTreatment,
  foreignKey: "treatment_id",
  otherKey: "doctor_id",
  as: "doctors"
});

// Doctor → Patients (clinical records)
User.hasMany(Patient, { foreignKey: "doctorId" });
Patient.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Patient ←→ Registered User associations (foreign key userId)
User.hasOne(Patient, { foreignKey: "userId", onDelete: "CASCADE" });
Patient.belongsTo(User, { as: "user", foreignKey: "userId" });

// Patient → Disease (canonical diagnosis)
Disease.hasMany(Patient, { foreignKey: "diagnosisId", as: "patients" });
Patient.belongsTo(Disease, { as: "disease", foreignKey: "diagnosisId" });

// Patient → Images
Patient.hasMany(PatientImage, { as: "images", foreignKey: "patientId", onDelete: "CASCADE" });
PatientImage.belongsTo(Patient, { foreignKey: "patientId" });

// Patient → Reviews
Patient.hasMany(PatientReview, { as: "reviews", foreignKey: "patientId", onDelete: "CASCADE" });
PatientReview.belongsTo(Patient, { foreignKey: "patientId" });
PatientReview.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Analysis
Patient.hasMany(Analysis, { as: "analyses", foreignKey: "patientId", onDelete: "CASCADE" });
Analysis.belongsTo(Patient, { foreignKey: "patientId" });
User.hasMany(Analysis, { foreignKey: "doctorId" });
Analysis.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Appointment
Patient.hasMany(Appointment, { foreignKey: "patientId", onDelete: "CASCADE" });
Appointment.belongsTo(Patient, { foreignKey: "patientId" });
User.hasMany(Appointment, { foreignKey: "doctorId" });
Appointment.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Medication
Patient.hasMany(Medication, { as: "medications", foreignKey: "patientId", onDelete: "CASCADE" });
Medication.belongsTo(Patient, { as: "patient", foreignKey: "patientId" });
User.hasMany(Medication, { foreignKey: "doctorId" });
Medication.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Medication → ClinicalMedication (canonical drug reference)
ClinicalMedication.hasMany(Medication, { foreignKey: "clinicalMedicationId", as: "prescriptions" });
Medication.belongsTo(ClinicalMedication, { as: "clinicalMedication", foreignKey: "clinicalMedicationId" });

// Message
User.hasMany(Message, { as: "sentMessages", foreignKey: "senderId" });
User.hasMany(Message, { as: "receivedMessages", foreignKey: "receiverId" });
Message.belongsTo(User, { as: "sender", foreignKey: "senderId" });
Message.belongsTo(User, { as: "receiver", foreignKey: "receiverId" });

// Notification
User.hasMany(Notification, { foreignKey: "doctorId" });
Notification.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });
Patient.hasMany(Notification, { foreignKey: "patientId" });
Notification.belongsTo(Patient, { foreignKey: "patientId" });

// Conversation → lastMessage
Conversation.belongsTo(Message, { as: "lastMsg", foreignKey: "lastMessageId" });

module.exports = {
  User,
  Patient,
  PatientImage,
  PatientReview,
  Analysis,
  Appointment,
  Medication,
  Conversation,
  Message,
  Notification,
  ClinicalMedication,
  Disease,
  DiseaseReport,
  SmartPatient,
  SmartDoctor,
  SmartTreatment,
  SmartPatientDisease,
  SmartImprovementRate,
  SmartDoctorTreatment,
};
