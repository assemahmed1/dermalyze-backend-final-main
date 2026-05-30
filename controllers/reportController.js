const { Patient, Disease, Medication, Analysis } = require("../models");
const { getDiseaseReportFromDB } = require("../routes/diseaseReport.repository");
const { sendWhatsAppMessage } = require("../services/whatsappService");

exports.getPatientReport = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findByPk(patientId, {
      include: [
        { model: Disease, as: "disease" },
        { model: Medication, as: "medications" },
        { model: Analysis, as: "analyses", order: [["createdAt", "DESC"]], limit: 1 }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    let diseaseInfo = null;
    if (patient.disease && patient.disease.name) {
      diseaseInfo = await getDiseaseReportFromDB(patient.disease.name);
    }

    const report = {
      patientName: patient.name,
      diagnosis: patient.disease ? patient.disease.name : "N/A",
      recoveryProgress: patient.recoveryProgress || 0,
      diseaseInfo: diseaseInfo,
      medications: patient.medications,
      latestAnalysis: patient.analyses && patient.analyses.length > 0 ? patient.analyses[0] : null
    };

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.sendPatientReportWhatsApp = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findByPk(patientId, {
      include: [
        { model: Disease, as: "disease" },
        { model: Medication, as: "medications" },
        { model: Analysis, as: "analyses" }
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (!patient.phone) {
      return res.status(400).json({ success: false, message: "Patient has no phone number on record" });
    }

    let diseaseInfo = null;
    if (patient.disease && patient.disease.name) {
      diseaseInfo = await getDiseaseReportFromDB(patient.disease.name);
    }

    // Prepare message
    let symptomsList = "لا توجد بيانات";
    if (diseaseInfo && diseaseInfo.symptoms && diseaseInfo.symptoms.length > 0) {
      symptomsList = diseaseInfo.symptoms.map(s => `- ${s}`).join('\n');
    }

    let medicationsList = "لا توجد أدوية موصوفة";
    if (patient.medications && patient.medications.length > 0) {
      medicationsList = patient.medications.map(m => `- ${m.name} (${m.dosage}) - ${m.frequency}`).join('\n');
    }

    let latestAnalysisSummary = "لا توجد تحاليل سابقة";
    if (patient.analyses && patient.analyses.length > 0) {
      patient.analyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = patient.analyses[0];
      latestAnalysisSummary = latest.diagnosisLabel || latest.result || "تم التحليل";
    }

    const message = `📋 تقريرك الطبي من Dermalyze
   
المريض: ${patient.name}
التشخيص: ${patient.disease ? patient.disease.name : "غير محدد"}
نسبة التحسن: ${patient.recoveryProgress || 0}%

🔬 الأعراض الشائعة للمرض:
${symptomsList}

💊 الأدوية الموصوفة:
${medicationsList}

📈 آخر تحليل AI:
${latestAnalysisSummary}

للاستفسار تواصل مع طبيبك.`;

    const result = await sendWhatsAppMessage(patient.phone, message);

    if (result.success) {
      return res.status(200).json({ success: true, message: "Report sent via WhatsApp successfully" });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send WhatsApp message", error: result.error });
    }
  } catch (err) {
    next(err);
  }
};
