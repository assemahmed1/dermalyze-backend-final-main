const User = require("../models/User");
const Patient = require("../models/Patient");
const Analysis = require("../models/Analysis");
const Notification = require("../models/Notification");
const Appointment = require("../models/Appointment");
const { createNotification } = require("../utils/notificationUtils");

// Link patient to doctor
exports.linkDoctor = async (req, res, next) => {
  try {
    const { doctorCode } = req.body;

    const doctor = await User.findOne({ doctorCode, role: "doctor" });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    await User.findByIdAndUpdate(req.user.id, { doctor: doctor._id }, { returnDocument: "after" });

    res.json({ message: "Doctor linked successfully", doctor: doctor.name });
  } catch (error) {
    next(error);
  }
};

// Get doctor's patients
exports.getPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id }).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    next(error);
  }
};

// Get patient analyses
exports.getPatientAnalyses = async (req, res, next) => {
  try {
    const { id } = req.params;

    // IDOR Fix: Explicitly check if the patient exists and belongs to this doctor
    const patient = await Patient.findOne({ _id: id, doctor: req.user.id });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const analyses = await Analysis.find({ patient: id }).sort({ createdAt: -1 });

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
      Patient.countDocuments({ doctor: doctorId }),
      Patient.countDocuments({ doctor: doctorId, status: "Critical" }),
      Patient.countDocuments({ doctor: doctorId, status: "Improving" }),
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
    const notifications = await Notification.find({ doctorId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// PUT /doctor/notifications/read
exports.markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ doctorId: req.user.id, isRead: false }, { isRead: true });
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

    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, doctor: req.user.id },
      {
        $push: {
          reviews: {
            text: review,
            doctorId: req.user.id,
          },
        },
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    res.status(201).json({
      message: "Review added successfully",
      reviews: patient.reviews,
    });
  } catch (error) {
    next(error);
  }
};

// GET /doctor/patients/:patientId/reviews
exports.getReviews = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ _id: patientId, doctor: req.user.id });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    // Return reviews sorted by createdAt descending
    const sortedReviews = patient.reviews.sort((a, b) => b.createdAt - a.createdAt);

    res.json(sortedReviews);
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
    const patient = await Patient.findOne({ _id: patientId, doctor: req.user.id });
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
    const appointments = await Appointment.find({ doctorId: req.user.id }).sort({ appointmentDate: 1 });
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

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, doctorId: req.user.id },
      { status },
      { returnDocument: "after", runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found or unauthorized access" });
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

// 🗓️ DELETE /doctor/appointments/:id
exports.deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOneAndDelete({ _id: id, doctorId: req.user.id });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found or unauthorized access" });
    }

    res.json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    next(error);
  }
};