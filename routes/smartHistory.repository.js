const { sequelize } = require("../config/db");
const { QueryTypes } = require("sequelize");

async function getPatientsByDisease(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];

  const query = `
    SELECT DISTINCT
      p.patient_id AS patient_id,
      p.first_name  AS first_name,
      p.last_name   AS last_name,
      p.age         AS age,
      p.gender      AS gender
    FROM smart_patients p
    INNER JOIN smart_patient_diseases pd ON p.patient_id = pd.patient_id
    INNER JOIN Diseases d               ON pd.disease_id = d.id
    INNER JOIN smart_improvement_rates ir ON p.patient_id = ir.patient_id
    WHERE ir.doctor_id = :doctorId
      AND LOWER(d.name) = :diseaseName
    ORDER BY p.patient_id ASC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      doctorId: parseInt(doctorId, 10),
      diseaseName: diseaseName.trim().toLowerCase()
    },
    type: QueryTypes.SELECT
  });

  return results;
}

async function getTreatmentsByDisease(doctorId, diseaseName) {
  if (!doctorId || !diseaseName) return [];

  const query = `
    SELECT
      t.name               AS treatment_name,
      ROUND(AVG(ir.rate), 1) AS average_rate
    FROM smart_improvement_rates ir
    INNER JOIN smart_treatments t        ON ir.treatment_id = t.treatment_id
    INNER JOIN smart_patients p          ON ir.patient_id   = p.patient_id
    INNER JOIN smart_patient_diseases pd ON p.patient_id    = pd.patient_id
    INNER JOIN Diseases d               ON pd.disease_id   = d.id
    WHERE ir.doctor_id = :doctorId
      AND LOWER(d.name) = :diseaseName
    GROUP BY t.treatment_id, t.name
    ORDER BY average_rate DESC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      doctorId: parseInt(doctorId, 10),
      diseaseName: diseaseName.trim().toLowerCase()
    },
    type: QueryTypes.SELECT
  });

  return results.map(r => ({
    treatment_name: r.treatment_name,
    average_rate: parseFloat(r.average_rate)
  }));
}

module.exports = {
  getPatientsByDisease,
  getTreatmentsByDisease
};
