const User = require("../models/User");
const Patient = require("../models/Patient");
const Analysis = require("../models/Analysis");
const Notification = require("../models/Notification");
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
      { new: true, runValidators: true }
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