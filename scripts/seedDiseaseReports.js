require('dotenv').config();
const { sequelize } = require("../config/db");
const Disease = require("../models/Disease");
const DiseaseReport = require("../models/DiseaseReport");

const commonSideEffects = {
  "acne": ["Permanent skin scarring (pitted or hyperpigmented)", "High psychological distress or depression", "Increased skin sensitivity", "Secondary bacterial infections"],
  "psoriasis": ["Psoriatic arthritis (joint pain/stiffness)", "Cardiovascular complications risk", "Increased risk of type 2 diabetes", "Social withdrawal or depression"],
  "eczema": ["Skin infections (e.g., bacterial, viral)", "Sleep disturbances due to itching", "Anxiety or low self-esteem", "Eye complications (rare, from scratching)"],
  "rosacea": ["Ocular rosacea (dry, irritated, red eyes)", "Thickening of facial skin (especially nose)", "Emotional embarrassment", "High sensitivity to skincare products"],
  "vitiligo": ["Increased risk of sunburn and skin cancer on white patches", "Eye inflammation (iritis)", "Hearing loss", "Severe social anxiety or distress"],
  "alopecia": ["Loss of eyebrows and eyelashes", "Nail pitting or ridging", "Psychological distress", "Increased vulnerability to sunburn on scalp"],
  "dermatitis": ["Secondary bacterial or fungal infections", "Chronic changes in skin color (hyperpigmentation)", "Lichenification (thick, leathery skin)", "Sleep disruption"],
  "melanoma": ["Metastasis to other organs", "Lymphedema from lymph node removal", "Fatigue", "Depression and anxiety"],
  "carcinoma": ["Local tissue destruction", "Scarring from surgical removal", "Risk of recurrence", "Changes in skin appearance"],
  "fungal": ["Secondary bacterial infection", "Spread to other body parts", "Nail deformities", "Chronic itching and discomfort"],
  "infection": ["Spread of infection to deeper tissues", "Scarring", "Fever and systemic symptoms", "Abscess formation"],
  "default": ["Secondary bacterial or viral skin infections", "Changes in skin pigmentation (darkening or lightening)", "Scarring or changes in skin texture", "Psychological distress or lowered self-esteem"]
};

const commonImprovementSigns = {
  "acne": ["Fewer new breakouts or lesions forming", "Shrinkage and drying of active pimples", "Smoothing of skin surface texture", "Gradual fading of dark red post-inflammatory spots"],
  "psoriasis": ["Thinning and flattening of silver scales", "Fading of red plaque boundaries", "Reduction in skin soreness or itching", "Decrease in nail pitting or joint stiffness"],
  "eczema": ["Significant reduction in itching", "Softening and rehydration of skin", "Clearing of red inflammatory patches", "Improvement in sleep quality and skin texture"],
  "rosacea": ["Fewer and less severe blushing episodes", "Fading of persistent facial redness", "Reduction of pustules and red bumps", "Diminishing burning or stinging sensations"],
  "vitiligo": ["Appearance of small dots of pigment within the white patches", "Shrinking margins of the depigmented areas", "Gradual return of natural skin color", "Stabilization of patch margins"],
  "alopecia": ["Emergence of fine, lightly colored downy hairs (vellus hair)", "Regrowth of normal-colored terminal hair", "Cessation of active hair shedding", "Reduction in exclamation mark hairs at patch borders"],
  "dermatitis": ["Reduction in redness and inflammation", "Decreased itching and scratching", "Healing of blisters or weeping skin", "Restoration of normal skin barrier function"],
  "melanoma": ["Successful surgical margins (no remaining cancer cells)", "Healing of biopsy or excision site", "Stable imaging results (no spread)", "Improvement in overall energy levels post-treatment"],
  "carcinoma": ["Clear surgical margins after removal", "Proper wound healing", "Reduction in crusting or bleeding", "Fading of the surgical scar"],
  "fungal": ["Clearing of scaling and redness", "Relief from itching and burning", "Healthy nail growth at the base (for nail fungus)", "Normalizing of skin color and texture"],
  "infection": ["Reduction in redness, warmth, and swelling", "Cessation of pus or fluid drainage", "Closing and healing of the skin lesion", "Disappearance of fever or systemic symptoms"],
  "default": ["Reduction in visible redness and inflammation", "Relief from pain, itching, or discomfort", "Healing of open lesions or cracked skin", "Gradual return to normal skin color and texture"]
};

function getAttributes(diseaseName, dictionary) {
  const name = diseaseName.toLowerCase();
  for (const [key, value] of Object.entries(dictionary)) {
    if (key !== "default" && name.includes(key)) {
      return value;
    }
  }
  return dictionary.default;
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to the database. Seeding Disease_Reports...");

    const diseases = await Disease.findAll();
    console.log(`Found ${diseases.length} diseases. Checking missing reports...`);

    let createdCount = 0;

    for (const disease of diseases) {
      const existing = await DiseaseReport.findOne({ where: { diseaseId: disease.id } });
      if (!existing) {
        const sideEffects = getAttributes(disease.name, commonSideEffects);
        const improvementSigns = getAttributes(disease.name, commonImprovementSigns);

        // Symptoms parsing from disease
        let symptoms = [];
        try {
          if (typeof disease.symptoms === 'string') {
            symptoms = JSON.parse(disease.symptoms);
          } else if (Array.isArray(disease.symptoms)) {
            symptoms = disease.symptoms;
          }
        } catch(e) {
          symptoms = disease.symptoms ? [disease.symptoms] : [];
        }

        if (symptoms.length === 0) {
          symptoms = ["Skin irritation", "Redness", "Itching"];
        }

        await DiseaseReport.create({
          diseaseId: disease.id,
          symptoms: symptoms,
          sideEffects: sideEffects,
          improvementSigns: improvementSigns,
        });
        createdCount++;
      }
    }

    console.log(`Seeding complete. Created ${createdCount} new Disease_Reports.`);
    process.exit(0);
  } catch (err) {
    console.error("Error seeding Disease_Reports:", err);
    process.exit(1);
  }
}

run();
