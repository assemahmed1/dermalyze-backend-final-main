const { sequelize } = require("../config/db");
const { QueryTypes } = require("sequelize");

async function getPatientsByDisease(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];

  const query = `
    SELECT DISTINCT
      sp.patient_id,
      sp.first_name,
      sp.last_name,
      sp.age,
      sp.gender
    FROM smart_patients sp
    INNER JOIN smart_patient_diseases spd ON sp.patient_id = spd.patient_id
    INNER JOIN Diseases d ON spd.disease_id = d.id
    INNER JOIN smart_improvement_rates ir ON sp.patient_id = ir.patient_id
    WHERE ir.doctor_id = :doctorId
      AND LOWER(d.name) LIKE :diseaseName
    ORDER BY sp.patient_id ASC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      doctorId: parseInt(doctorId, 10),
      diseaseName: `%${diseaseName.trim().toLowerCase()}%`
    },
    type: QueryTypes.SELECT
  });

  return results;
}

async function getTreatmentsByDisease(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];

  const query = `
    SELECT 
      t.name AS treatment_name,
      t.dosage AS dosage,
      ROUND(AVG(ir.rate), 1) AS average_rate,
      COUNT(DISTINCT ir.patient_id) AS patient_count
    FROM smart_improvement_rates ir
    INNER JOIN smart_treatments t ON ir.treatment_id = t.treatment_id
    INNER JOIN smart_patients sp ON ir.patient_id = sp.patient_id
    INNER JOIN smart_patient_diseases spd ON sp.patient_id = spd.patient_id
    INNER JOIN Diseases d ON spd.disease_id = d.id
    WHERE ir.doctor_id = :doctorId
      AND LOWER(d.name) LIKE :diseaseName
    GROUP BY t.treatment_id, t.name, t.dosage
    ORDER BY average_rate DESC, patient_count DESC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      doctorId: parseInt(doctorId, 10),
      diseaseName: `%${diseaseName.trim().toLowerCase()}%`
    },
    type: QueryTypes.SELECT
  });

  return results.map(r => ({
    treatment_name: r.treatment_name,
    dosage: r.dosage,
    average_rate: parseFloat(r.average_rate),
    patient_count: parseInt(r.patient_count)
  }));
}

module.exports = {
  getPatientsByDisease,
  getTreatmentsByDisease
};
