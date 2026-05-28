const Patient = require("../models/Patient");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendActivationLink } = require("../services/whatsappService");
const { getOrCreatePatient } = require("../utils/patientUtils");

const createPatient = async (req, res) => {
  try {
    const { name, age, gender, diagnosis, nationalId, phone, address, medicalHistory } = req.body;

    if (!name || !age || !gender) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 1. Create the clinical patient record
    const patient = await Patient.create({
      name, age, gender, diagnosis,
      nationalId, phone, address, medicalHistory,
      doctorId: req.user.id,
    });

    // 2. Auto-create a User account for the patient
    //    Use a random unguessable password — patient will set their own via magic link
    const randomPassword = crypto.randomBytes(32).toString("hex");

    //    Derive a placeholder email from patient id (must be unique and valid)
    const placeholderEmail = `patient_${patient.id}@dermalyze.internal`;

    const patientUser = await User.create({
      name,
      email: placeholderEmail,
      password: randomPassword,       // beforeCreate hook will bcrypt-hash this
      role: "patient",
      status: "pending_activation",
      doctorId: req.user.id,
      phone: phone || "",
      nationalId: nationalId || "",
    });

    // 3. Link the User record back to the Patient record
    patient.userId = patientUser.id;
    await patient.save();

    // 4. Generate a 48-hour magic link JWT using MAGIC_LINK_SECRET
    const magicToken = jwt.sign(
      { userId: patientUser.id, patientId: patient.id, purpose: "account_activation" },
      process.env.MAGIC_LINK_SECRET,
      { expiresIn: "48h" }
    );

    // 5. Send WhatsApp activation message — non-fatal if it fails
    let whatsappSent = false;
    if (phone) {
      const waResult = await sendActivationLink(phone, name, magicToken);
      whatsappSent = waResult.success;
      if (!waResult.success) {
        console.error(`[WHATSAPP WARNING] Patient ${patient.id} created but WhatsApp failed: ${waResult.error}`);
      }
    } else {
      console.error(`[WHATSAPP WARNING] Patient ${patient.id} has no phone number — WhatsApp not sent`);
    }

    const response = {
      success: true,
      message: "Patient created successfully",
      patient,
      whatsappSent,
    };

    if (!whatsappSent) {
      response.warning = "WhatsApp activation message could not be sent. You may share the activation link manually.";
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows: patients, count } = await Patient.findAndCountAll({
      where: { doctorId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      data: patients,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patient = await getOrCreatePatient(req.params.id, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (error) {
    next(error);
  }
};

const updatePatientStatus = async (req, res, next) => {
  try {
    let { status } = req.body;

    if (status) {
      // Normalize status to Title Case (e.g. "critical" -> "Critical")
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    const allowedStatuses = ["Improving", "Stable", "Critical"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const patient = await getOrCreatePatient(req.params.id, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.status = status;
    await patient.save();

    // Also sync the `isCritical` flag in the User table if it exists
    if (patient.userId) {
      const User = require("../models/User");
      await User.update(
        { isCritical: status === "Critical" },
        { where: { id: patient.userId } }
      );

      // -- REAL-TIME NOTIFICATION --
      const patientUser = await User.findByPk(patient.userId);
      const { getIO } = require("../services/socketHandler");
      const io = getIO();
      if (io && patientUser) {
        io.to(String(patientUser.id)).emit("profile_updated", {
          status: status,
          isCritical: status === "Critical",
          message: `Your status has been updated to ${status}.`
        });
      }

      if (patientUser && patientUser.fcmToken && patientUser.pushNotifications !== false) {
        const { sendPushNotification } = require("../services/notificationService");
        sendPushNotification(patientUser.fcmToken, {
          title: "Status Updated",
          body: `Dr. ${req.user.name} has updated your clinical status to ${status}.`,
          data: { type: "status_update", status: status }
        }).catch(err => console.error("[FCM Error]", err));
      }
      // ----------------------------
    }

    res.status(200).json({ 
      message: "Patient status updated successfully", 
      patient: patient 
    });
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

    const patient = await getOrCreatePatient(req.params.id, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.recoveryProgress = progress;
    await patient.save();

    // Emit real-time Socket.io events so both Doctor and Patient UI update instantly
    try {
      const { getIO } = require("../services/socketHandler");
      const io = getIO();
      if (io) {
        // Notify doctor's UI
        io.to(String(req.user.id)).emit("patient_updated", {
          patientId: patient.userId || patient.id,
          recoveryProgress: progress,
          improvement: "+0%" // Manual update safe fallback
        });
        // Notify patient's UI
        if (patient.userId) {
          io.to(String(patient.userId)).emit("profile_updated", {
            recoveryProgress: progress,
            improvement: "+0%",
            message: `Your doctor has updated your recovery progress to ${progress}%.`
          });
        }
      }
    } catch (_) {}

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