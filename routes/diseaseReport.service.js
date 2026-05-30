const { getDiseaseReportFromDB } = require("./diseaseReport.repository");

async function getDiseaseReport(diseaseName, patientId = null) {
  if (!diseaseName || typeof diseaseName !== "string") return null;
  return await getDiseaseReportFromDB(diseaseName.trim().toLowerCase(), patientId);
}

module.exports = { getDiseaseReport };
