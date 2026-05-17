const { getPatientsByDisease, getTreatmentsByDisease } = require("./smartHistory.repository");

async function getSmartPatients(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];
  return await getPatientsByDisease(doctorId, diseaseName);
}

async function getSmartTreatments(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];
  return await getTreatmentsByDisease(doctorId, diseaseName);
}

module.exports = {
  getSmartPatients,
  getSmartTreatments
};
