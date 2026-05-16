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
const ClinicalDisease = require("./ClinicalDisease");
const ClinicalMedication = require("./ClinicalMedication");

// ========================
// Associations
// ========================

// User self-reference (patient → doctor)
User.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });
User.hasMany(User, { as: "patients", foreignKey: "doctorId" });

// Doctor → Patients (clinical records)
User.hasMany(Patient, { foreignKey: "doctorId" });
Patient.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Patient → Images
Patient.hasMany(PatientImage, { as: "images", foreignKey: "patientId", onDelete: "CASCADE" });
PatientImage.belongsTo(Patient, { foreignKey: "patientId" });

// Patient → Reviews
Patient.hasMany(PatientReview, { as: "reviews", foreignKey: "patientId", onDelete: "CASCADE" });
PatientReview.belongsTo(Patient, { foreignKey: "patientId" });
PatientReview.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Analysis
Patient.hasMany(Analysis, { foreignKey: "patientId", onDelete: "CASCADE" });
Analysis.belongsTo(Patient, { foreignKey: "patientId" });
User.hasMany(Analysis, { foreignKey: "doctorId" });
Analysis.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Appointment
Patient.hasMany(Appointment, { foreignKey: "patientId", onDelete: "CASCADE" });
Appointment.belongsTo(Patient, { foreignKey: "patientId" });
User.hasMany(Appointment, { foreignKey: "doctorId" });
Appointment.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

// Medication
Patient.hasMany(Medication, { foreignKey: "patientId", onDelete: "CASCADE" });
Medication.belongsTo(Patient, { as: "patient", foreignKey: "patientId" });
User.hasMany(Medication, { foreignKey: "doctorId" });
Medication.belongsTo(User, { as: "doctor", foreignKey: "doctorId" });

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
  ClinicalDisease,
  ClinicalMedication,
};
