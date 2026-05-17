const User = require("../models/User");
const Patient = require("../models/Patient");
const PatientReview = require("../models/PatientReview");
const Analysis = require("../models/Analysis");
const Notification = require("../models/Notification");
const Appointment = require("../models/Appointment");
const { createNotification } = require("../utils/notificationUtils");

// Link patient to doctor
exports.linkDoctor = async (req, res, next) => {
  try {
    const { doctorCode } = req.body;

    const doctor = await User.findOne({ where: { doctorCode, role: "doctor" } });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    await User.update({ doctorId: doctor.id }, { where: { id: req.user.id } });

    res.json({ message: "Doctor linked successfully", doctor: doctor.name });
  } catch (error) {
    next(error);
  }
};

// Get doctor's patients
exports.getPatients = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    // Find all users (role patient) belonging to this doctor
    const patients = await User.findAll({
      where: {
        doctorId: doctorId,
        role: "patient"
      },
      order: [["createdAt", "DESC"]]
    });

    const formattedPatients = patients.map(p => ({
      id: p.id.toString(),
      name: p.name,
      email: p.email,
      phone: p.phone || "",
      diagnosis: p.diagnosis || null,
      isCritical: p.isCritical || false
    }));

    res.json({
      patients: formattedPatients
    });
  } catch (error) {
    next(error);
  }
};

// Get patient analyses
exports.getPatientAnalyses = async (req, res, next) => {
  try {
    const { id } = req.params;

    // IDOR Fix: Explicitly check if the patient exists and belongs to this doctor
    const patient = await Patient.findOne({ where: { id, doctorId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const analyses = await Analysis.findAll({
      where: { patientId: id },
      order: [["createdAt", "DESC"]],
    });

    res.json(analyses);
  } catch (error) {
    next(error);
  }
};

// ✅ Doctor Stats — Total / Critical / Active
exports.getDoctorStats = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const [total, critical, improving] = await Promise.all([
      Patient.count({ where: { doctorId } }),
      Patient.count({ where: { doctorId, status: "Critical" } }),
      Patient.count({ where: { doctorId, status: "Improving" } }),
    ]);

    res.json({
      totalPatients: total,
      criticalCases: critical,
      activeToday: improving,
      infectedPeople: total, // All patients have a skin condition
    });
  } catch (error) {
    next(error);
  }
};

// GET /doctor/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { doctorId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// PUT /doctor/notifications/read
exports.markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { doctorId: req.user.id, isRead: false } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

// POST /doctor/notifications/test (FOR TESTING ONLY)
exports.testNotification = async (req, res, next) => {
  try {
    const notification = await createNotification(req.user.id, {
      title: "Test Notification",
      body: "This is a sample notification created to verify the system works! ✅",
      type: "system",
    });
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

// POST /doctor/notifications/test-bulk (FOR TESTING ONLY)
exports.testBulkNotifications = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const samples = [
      {
        title: "New Patient Assigned",
        body: "A new patient has been assigned to your care. Please check their profile.",
        type: "new_patient",
      },
      {
        title: "Analysis Completed",
        body: "The AI analysis for Ahmed's skin scan is ready for your review.",
        type: "analysis_done",
      },
      {
        title: "Upcoming Appointment",
        body: "You have a scheduled appointment with Sarah at 10:00 AM tomorrow.",
        type: "appointment",
      },
      {
        title: "System Update",
        body: "The clinical resource library has been updated with 12 new medications.",
        type: "system",
      },
      {
        title: "Emergency Alert",
        body: "Critical patient status detected. Immediate review required.",
        type: "system",
      },
    ];

    const results = await Promise.all(
      samples.map((s) => createNotification(doctorId, s))
    );

    res.status(201).json({
      message: "5 sample notifications created successfully",
      notifications: results,
    });
  } catch (error) {
    next(error);
  }
};

// POST /doctor/patients/:patientId/review
exports.addReview = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { review } = req.body;

    // Verify patient belongs to this doctor
    const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const newReview = await PatientReview.create({
      patientId,
      doctorId: req.user.id,
      text: review,
    });

    // Return all reviews for this patient
    const reviews = await PatientReview.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });

    res.status(201).json({
      message: "Review added successfully",
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// GET /doctor/patients/:patientId/reviews
exports.getReviews = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const reviews = await PatientReview.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

// 🗓️ POST /doctor/patients/:patientId/appointments
exports.createAppointment = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { patientName, diagnosis, appointmentDate, appointmentTime } = req.body;

    // Verify patient belongs to doctor
    const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId: req.user.id,
      patientName,
      diagnosis,
      appointmentDate,
      appointmentTime,
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

// 🗓️ GET /doctor/appointments
exports.getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { doctorId: req.user.id },
      order: [["appointmentDate", "ASC"]],
    });
    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

// 🗓️ PUT /doctor/appointments/:id/status
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [affectedRows] = await Appointment.update(
      { status },
      { where: { id, doctorId: req.user.id } }
    );

    if (affectedRows === 0) {
      return res.status(404).json({ message: "Appointment not found or unauthorized access" });
    }

    const appointment = await Appointment.findByPk(id);
    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

// 🗓️ DELETE /doctor/appointments/:id
exports.deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Appointment.destroy({ where: { id, doctorId: req.user.id } });

    if (deleted === 0) {
      return res.status(404).json({ message: "Appointment not found or unauthorized access" });
    }

    res.json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    next(error);
  }
};