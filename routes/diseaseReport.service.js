const { getDiseaseReportFromDB } = require("./diseaseReport.repository");

async function getDiseaseReport(diseaseName) {
  if (!diseaseName || typeof diseaseName !== "string") return null;
  return await getDiseaseReportFromDB(diseaseName.trim().toLowerCase());
}

module.exports = { getDiseaseReport };
