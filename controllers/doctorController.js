const User = require("../models/User");
const Patient = require("../models/Patient");
const { getOrCreatePatient } = require("../utils/patientUtils");
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
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Find all users (role patient) belonging to this doctor
    const { rows: patients, count } = await User.findAndCountAll({
      where: { doctorId, role: "patient" },
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    // Fetch their corresponding clinical Patient records to get the status
    const userIds = patients.map(p => p.id);
    const clinicalPatients = await Patient.findAll({ where: { userId: userIds } });
    
    const clinicalPatientsMap = {};
    clinicalPatients.forEach(cp => {
      clinicalPatientsMap[cp.userId] = cp;
    });

    const formattedPatients = patients.map(p => {
      // Determine status from clinical table if exists, otherwise fallback to User's isCritical flag
      const cp = clinicalPatientsMap[p.id];
      let status = cp ? cp.status : (p.isCritical ? "Critical" : "Stable");

      let age = cp && cp.age ? cp.age : 0;
      if (p.dateOfBirth && !isNaN(new Date(p.dateOfBirth).getTime())) {
        const today = new Date();
        const birthDate = new Date(p.dateOfBirth);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (!isNaN(calculatedAge)) {
          age = calculatedAge;
        }
      }

      return {
        id: p.id.toString(),
        name: p.name,
        email: p.email,
        phone: p.phone || "",
        diagnosis: p.diagnosis || null,
        isCritical: p.isCritical || false,
        status: status, // <-- Crucial for the Flutter App filtering
        age: age,
        birthDate: p.dateOfBirth || null,
        recoveryProgress: cp ? cp.recoveryProgress : 0,
        recoveryRate: cp ? cp.recoveryProgress : 0,
        lastVisit: cp ? cp.lastVisit : null,
        nextAppointment: cp ? cp.nextAppointment : null
      };
    });

    res.json({
      patients: formattedPatients,
      total: count,
      page,
      pages: Math.ceil(count / limit)
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
    const patient = await getOrCreatePatient(id, req.user.id);
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

// GET /doctor/patients/:id
exports.getPatientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Find the User record
    const user = await User.findOne({
      where: { id, role: "patient", doctorId: req.user.id },
      attributes: { exclude: ["password", "resetPasswordOTP", "resetPasswordOTPExpires", "twoFactorSecret"] }
    });

    if (!user) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    // 2. Fetch the corresponding clinical Patient record
    const patientClinical = await Patient.findOne({ where: { userId: user.id } });

    // Fetch medications for this patient
    const Medication = require("../models/Medication");
    const medications = patientClinical 
      ? await Medication.findAll({ where: { patientId: patientClinical.id }, order: [["createdAt", "DESC"]] })
      : [];

    // Fetch the latest analysis to parse improvement
    const Analysis = require("../models/Analysis");
    const latestAnalysis = patientClinical 
      ? await Analysis.findOne({ where: { patientId: patientClinical.id }, order: [["createdAt", "DESC"]] })
      : null;

    let parsedRecovery = patientClinical ? patientClinical.recoveryProgress : 0;
    let improvementStr = "+0%";

    if (latestAnalysis && latestAnalysis.improvement) {
      const rawImprovement = latestAnalysis.improvement;
      const match = rawImprovement.match(/([+-]?\d+(\.\d+)?)/);
      if (match) {
        // Format improvement string as just "+65.0%"
        improvementStr = (parseFloat(match[1]) >= 0 ? "+" : "") + match[1] + "%";
      }
    }

    let age = patientClinical && patientClinical.age ? patientClinical.age : 0;
    if (user.dateOfBirth && !isNaN(new Date(user.dateOfBirth).getTime())) {
      const today = new Date();
      const birthDate = new Date(user.dateOfBirth);
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (!isNaN(calculatedAge)) {
        age = calculatedAge;
      }
    }

    // 3. Assemble detailed patient object
    const detailedPatient = {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      diagnosis: user.diagnosis || null,
      allergies: user.allergies || null,
      isCritical: user.isCritical || false,
      dateOfBirth: user.dateOfBirth || "",
      age: age,
      nationalId: user.nationalId || "",
      // Clinical fields
      status: patientClinical ? patientClinical.status : (user.isCritical ? "Critical" : "Stable"),
      recoveryProgress: parsedRecovery,
      recoveryRate: parsedRecovery,
      recovery: parsedRecovery,
      improvement: improvementStr,
      medicalHistory: patientClinical ? patientClinical.medicalHistory : "",
      nextAppointment: patientClinical ? patientClinical.nextAppointment : null,
      lastVisit: patientClinical ? patientClinical.lastVisit : null,
      medications: medications
    };

    res.json({ patient: detailedPatient });
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
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const newReview = await PatientReview.create({
      patientId: patient.id,
      doctorId: req.user.id,
      text: review,
    });

    // Return all reviews for this patient
    const reviews = await PatientReview.findAll({
      where: { patientId: patient.id },
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

    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    const reviews = await PatientReview.findAll({
      where: { patientId: patient.id },
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

    // 1. Basic validation
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: "Appointment date and time are required." });
    }

    if (appointmentDate === 'Invalid date' || isNaN(Date.parse(appointmentDate))) {
      return res.status(400).json({ message: "The provided appointment date is invalid. Please check the date format in the app." });
    }

    // 2. Verify patient belongs to doctor
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found or unauthorized access" });
    }

    // 3. Create the new appointment
    const appointment = await Appointment.create({
      patientId: patient.id,
      doctorId: req.user.id,
      patientName: patientName || patient.name,
      diagnosis: diagnosis || patient.diagnosis,
      appointmentDate,
      appointmentTime,
    });

    // 4. Update the patient's next appointment date and last visit
    patient.nextAppointment = `${appointmentDate} at ${appointmentTime}`;
    // The user requested that the day the appointment was scheduled becomes the "last visit" date
    patient.lastVisit = new Date().toISOString().split('T')[0]; 
    await patient.save();

    // -- REAL-TIME NOTIFICATION (The "Normal App" behavior) --
    const User = require("../models/User");
    const patientUser = await User.findByPk(patient.userId);
    
    // 1. Emit Socket.io Event for live update
    const { getIO } = require("../services/socketHandler");
    const io = getIO();
    if (io) {
      if (patientUser) {
        io.to(String(patientUser.id)).emit("profile_updated", {
          nextAppointment: patient.nextAppointment,
          lastVisit: patient.lastVisit,
          message: "A new follow-up appointment was scheduled."
        });
      }
      io.to(String(req.user.id)).emit("patient_updated", {
        patientId: patientUser ? patientUser.id : patientId,
        nextAppointment: patient.nextAppointment,
        lastVisit: patient.lastVisit
      });
    }

    // 2. Send Push Notification
    if (patientUser && patientUser.fcmToken && patientUser.pushNotifications !== false) {
      const { sendPushNotification } = require("../services/notificationService");
      sendPushNotification(patientUser.fcmToken, {
        title: "New Appointment Scheduled",
        body: `Dr. ${req.user.name} scheduled your next visit for ${appointmentDate} at ${appointmentTime}.`,
        data: { type: "appointment" }
      }).catch(err => console.error("[FCM Error]", err));
    }
    // ---------------------------------------------------------

    // Build a detailed patient object so the frontend can properly merge it by User ID
    const detailedPatient = {
      id: patientUser ? patientUser.id.toString() : patientId.toString(),
      name: patientUser ? patientUser.name : patient.name,
      email: patientUser ? patientUser.email : "",
      phone: patientUser ? patientUser.phone : patient.phone,
      diagnosis: patientUser ? patientUser.diagnosis : patient.diagnosis,
      isCritical: patientUser ? patientUser.isCritical : false,
      status: patient.status,
      recoveryProgress: patient.recoveryProgress,
      nextAppointment: patient.nextAppointment,
      lastVisit: patient.lastVisit
    };

    // 5. Return success
    return res.status(201).json({
      message: "Follow-up appointment scheduled successfully.",
      appointment: appointment,
      patient: detailedPatient
    });
  } catch (error) {
    console.error("Error scheduling appointment:", error);
    next(error);
  }
};

// 🗓️ GET /doctor/appointments
exports.getAppointments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows: appointments, count } = await Appointment.findAndCountAll({
      where: { doctorId: req.user.id },
      order: [["appointmentDate", "ASC"]],
      limit,
      offset
    });
    res.json({
      data: appointments,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    });
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