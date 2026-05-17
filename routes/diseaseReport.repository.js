const { sequelize } = require("../config/db");
const { QueryTypes } = require("sequelize");

async function getDiseaseReportFromDB(diseaseName) {
  if (!diseaseName) return null;

  const query = `
    SELECT 
      d.name AS disease_name,
      d.scientificName AS scientific_name,
      d.generalInfo AS general_info,
      dr.symptoms AS symptoms,
      dr.sideEffects AS side_effects,
      dr.improvementSigns AS improvement_signs
    FROM Disease_Reports dr
    INNER JOIN Diseases d ON dr.diseaseId = d.id
    WHERE LOWER(d.name) = :diseaseName
    LIMIT 1
  `;

  const results = await sequelize.query(query, {
    replacements: { diseaseName: diseaseName.toLowerCase() },
    type: QueryTypes.SELECT
  });

  if (!results || results.length === 0) {
    return null;
  }

  const report = results[0];

  // Helper to parse JSON arrays safely in case the dialect driver returns strings
  const parseJsonArray = (val) => {
    if (!val) return [];
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [];
      }
    }
    return val;
  };

  return {
    disease_name: report.disease_name,
    scientific_name: report.scientific_name,
    general_info: report.general_info,
    symptoms: parseJsonArray(report.symptoms),
    side_effects: parseJsonArray(report.side_effects),
    improvement_signs: parseJsonArray(report.improvement_signs)
  };
}

module.exports = { getDiseaseReportFromDB };
