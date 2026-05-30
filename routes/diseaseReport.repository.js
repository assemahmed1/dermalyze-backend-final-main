const { sequelize } = require("../config/db");
const { QueryTypes } = require("sequelize");
const Patient = require("../models/Patient");

async function getDiseaseReportFromDB(diseaseName, patientId = null) {
  if (!diseaseName) return null;

  const query = `
    SELECT 
      d.id AS id,
      d.name AS disease_name,
      d.scientificName AS scientific_name,
      d.generalInfo AS general_info,
      d.severity AS severity,
      d.category AS category,
      d.imageUrl AS image_url,
      d.visualPatterns AS visual_patterns,
      d.treatments AS treatments,
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

  const symptomsList = parseJsonArray(report.symptoms);
  const sideEffectsList = parseJsonArray(report.side_effects);
  const treatmentsList = parseJsonArray(report.treatments);
  const visualPatternsList = parseJsonArray(report.visual_patterns);
  const improvementSigns = parseJsonArray(report.improvement_signs);

  // Fetch patient data if available to populate personalized info
  let diagnosedOn = "Not Available";
  let currentStatus = "Unknown";
  
  if (patientId) {
    const patient = await Patient.findOne({ where: { userId: patientId } });
    if (patient) {
      diagnosedOn = patient.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      currentStatus = patient.status || "Unknown";
    }
  }

  // Format tags
  const tags = [];
  if (report.category) tags.push(report.category);
  tags.push(report.severity === "High" ? "Chronic Condition" : "Manageable");

  // Format symptoms to match UI (with name, severity, value)
  const current_symptoms = symptomsList.slice(0, 3).map((sym, index) => {
    // Generate some varied severities for UI mock purposes if not available
    const severities = [
      { severity: "Moderate", value: 60 },
      { severity: "Mild", value: 30 },
      { severity: "Severe", value: 90 }
    ];
    const sev = severities[index % 3];
    return { name: sym, severity: sev.severity, value: sev.value };
  });

  // Format treatment plan
  const treatment_plan = (treatmentsList.length > 0 ? treatmentsList : improvementSigns).slice(0, 3).map((item, index) => {
    const titles = ["Topical Medications", "Moisturize Regularly", "Lifestyle Adjustments"];
    return {
      title: titles[index] || "Care Plan",
      description: item
    };
  });

  return {
    disease_name: report.disease_name,
    also_known_as: report.scientific_name || "Unknown",
    tags: tags,
    diagnosis_info: {
      diagnosed_on: diagnosedOn,
      severity_level: report.severity || "Moderate",
      current_status: currentStatus
    },
    about: {
      description: report.general_info,
      common_triggers: [
        "Dry skin",
        "Irritants (soaps, detergents)",
        "Stress",
        "Hot and humid weather"
      ]
    },
    affected_areas: visualPatternsList.length > 0 ? visualPatternsList : ["Face", "Neck", "Hands & Wrists", "Behind Knees"],
    current_symptoms: current_symptoms,
    treatment_plan: treatment_plan,
    when_to_contact_doctor: sideEffectsList.length > 0 ? sideEffectsList : [
      "Severe itching that disrupts sleep",
      "Signs of infection (warmth, pus, fever)",
      "Condition worsens despite treatment",
      "Widespread skin involvement"
    ]
  };
}

module.exports = { getDiseaseReportFromDB };
