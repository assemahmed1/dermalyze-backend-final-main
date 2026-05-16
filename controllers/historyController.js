const Patient = require("../models/Patient");
const Medication = require("../models/Medication");
const { Op } = require("sequelize");

// 🧠 My Smart History
exports.getSmartHistory = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { disease } = req.query;

    if (!disease) {
      return res.status(400).json({ message: "Disease name is required" });
    }

    const patients = await Patient.findAll({
      where: {
        doctorId,
        diagnosis: { [Op.like]: `%${disease}%` },
      },
    });

    if (patients.length === 0) {
      return res.json({
        disease,
        totalPatients: 0,
        message: "No patients found with this diagnosis",
        insights: [],
      });
    }

    const patientIds = patients.map((p) => p.id);

    const medications = await Medication.findAll({
      where: {
        patientId: { [Op.in]: patientIds },
        doctorId,
      },
      include: [{ model: Patient, as: "patient", attributes: ["name", "recoveryProgress"] }],
    });

    const drugMap = {};
    for (const med of medications) {
      const drugName = med.name;
      const recovery = med.patient?.recoveryProgress || 0;
      if (!drugMap[drugName]) {
        drugMap[drugName] = { name: drugName, totalCases: 0, totalRecovery: 0, patients: [] };
      }
      drugMap[drugName].totalCases += 1;
      drugMap[drugName].totalRecovery += recovery;
      drugMap[drugName].patients.push({
        name: med.patient?.name,
        recoveryProgress: recovery,
        weeksOfTreatment: Math.ceil((new Date() - new Date(med.createdAt)) / (1000 * 60 * 60 * 24 * 7)),
      });
    }

    const insights = Object.values(drugMap)
      .map((drug) => ({
        name: drug.name,
        totalCases: drug.totalCases,
        avgRecovery: Math.round(drug.totalRecovery / drug.totalCases),
        patients: drug.patients.sort((a, b) => b.recoveryProgress - a.recoveryProgress),
      }))
      .sort((a, b) => b.avgRecovery - a.avgRecovery);

    const bestDrug = insights[0] || null;
    const highestRecovery = bestDrug ? Math.max(...bestDrug.patients.map((p) => p.recoveryProgress)) : 0;

    res.json({
      disease,
      totalPatients: patients.length,
      bestDrug: bestDrug?.name || null,
      highestRecovery,
      avgRecovery: bestDrug?.avgRecovery || 0,
      insights,
    });
  } catch (error) {
    next(error);
  }
};
