const Patient = require("../models/Patient");
const User = require("../models/User");

/**
 * Calculates age in years from a Date of Birth string (YYYY-MM-DD format).
 * Returns 25 as a default fallback if DOB is not provided or invalid.
 * @param {string} dobString - Date of birth string
 * @returns {number} Age in years
 */
function calculateAge(dobString) {
  if (!dobString) return 25;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 25;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Ensures a clinical patient record exists in the Patients table for a given patient ID.
 * If the record does not exist but a registered patient user exists in the Users table,
 * it dynamically creates/syncs the clinical patient record.
 * @param {number|string} patientId - The ID of the patient
 * @param {number|string} doctorId - The ID of the doctor managing the patient
 * @returns {Promise<Object|null>} The patient record, or null if not found/unauthorized
 */
async function getOrCreatePatient(patientId, doctorId) {
  try {
    // 1. Try to find the patient in the Patients clinical records table
    let patient = await Patient.findOne({ where: { id: patientId, doctorId } });
    if (patient) return patient;

    // 2. If not found, check if a registered patient User exists with this ID linked to the doctor
    const user = await User.findOne({ where: { id: patientId, role: "patient", doctorId } });
    if (!user) return null;

    // 3. Initialize the clinical record in Patients table using User details
    patient = await Patient.create({
      id: user.id, // Explicitly use User ID
      name: user.name,
      age: calculateAge(user.dateOfBirth),
      gender: "male", // Default since User model does not store gender
      nationalId: user.nationalId || "",
      phone: user.phone || "",
      doctorId: user.doctorId,
      diagnosis: user.diagnosis || "",
      status: "Stable",
      recoveryProgress: 0,
    });

    console.log(`✨ Dynamically initialized clinical Patient record for User ID: ${user.id}`);
    return patient;
  } catch (error) {
    console.error(`[getOrCreatePatient ERROR] ${error.stack || error.message}`);
    throw error;
  }
}

module.exports = {
  getOrCreatePatient,
};
