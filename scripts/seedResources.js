require("dotenv").config();
const { connectDB, sequelize } = require("../config/db");

// Load all models + associations
require("../models");

const ClinicalMedication = require("../models/ClinicalMedication");
const ClinicalDisease = require("../models/ClinicalDisease");

const seedData = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    // Clear existing data
    await ClinicalMedication.destroy({ where: {} });
    await ClinicalDisease.destroy({ where: {} });

    // 1) Seed Medications
    const medications = [
      {
        name: "Methotrexate", category: "Immunosuppressant",
        description: "A medicine used to treat severe psoriasis and certain types of arthritis.",
        uses: ["Severe Psoriasis", "Rheumatoid Arthritis"],
        sideEffects: ["Nausea", "Fatigue", "Hair thinning", "Mouth sores"],
        dosage: "Typically 7.5mg to 25mg taken once weekly."
      },
      {
        name: "Tretinoin (Retin-A)", category: "Retinoid",
        description: "A topical form of vitamin A used to treat acne and sun-damaged skin.",
        uses: ["Acne Vulgaris", "Fine wrinkles", "Skin hyperpigmentation"],
        sideEffects: ["Skin peeling", "Redness", "Dryness", "Photosensitivity"],
        dosage: "Apply a thin layer to affected area once daily before bedtime."
      },
      {
        name: "Hydrocortisone Cream", category: "Corticosteroid",
        description: "A mild topical steroid used to reduce skin inflammation and itching.",
        uses: ["Eczema", "Insect bites", "Dermatitis", "Rashes"],
        sideEffects: ["Skin thinning (with long-term use)", "Stinging", "Irritation"],
        dosage: "Apply to affected area 2-3 times daily."
      },
      {
        name: "Adapalene (Differin)", category: "Retinoid-like",
        description: "A third-generation topical retinoid primarily used for mild-to-moderate acne.",
        uses: ["Acne", "Blackheads", "Whiteheads"],
        sideEffects: ["Redness", "Scaling", "Burning sensation"],
        dosage: "Apply once daily to the entire face after washing."
      },
      {
        name: "Ketoconazole", category: "Antifungal",
        description: "Used to treat fungal infections of the skin such as athlete's foot and dandruff.",
        uses: ["Seborrheic dermatitis", "Pityriasis versicolor", "Athlete's foot"],
        sideEffects: ["Itching", "Irritation", "Dry skin"],
        dosage: "Apply to the affected skin or scalp once or twice daily."
      }
    ];

    // 2) Seed Diseases
    const diseases = [
      {
        name: "Melanoma",
        description: "The most serious type of skin cancer, developing in the melanocytes that produce pigment.",
        symptoms: ["Changing moles", "Irregular borders", "Asymmetrical shapes", "Multiple colors"],
        treatments: ["Surgical excision", "Immunotherapy", "Radiation therapy", "Targeted therapy"],
        imageUrl: "https://example.com/images/melanoma.jpg"
      },
      {
        name: "Psoriasis",
        description: "A chronic autoimmune condition where skin cells build up quickly, forming scales and itchy, dry patches.",
        symptoms: ["Red patches with silvery scales", "Dry cracked skin", "Itching or burning"],
        treatments: ["Topical corticosteroids", "Phototherapy", "Biologic medications", "Moisturizers"],
        imageUrl: "https://example.com/images/psoriasis.jpg"
      },
      {
        name: "Eczema (Atopic Dermatitis)",
        description: "A condition that makes your skin red and itchy. Common in children but can occur at any age.",
        symptoms: ["Dry skin", "Itching", "Red to brownish-gray patches", "Small raised bumps"],
        treatments: ["Moisturizing regularly", "Topical steroids", "Avoiding triggers", "Antihistamines"],
        imageUrl: "https://example.com/images/eczema.jpg"
      },
      {
        name: "Acne Vulgaris",
        description: "A common skin condition from plugged hair follicles.",
        symptoms: ["Whiteheads", "Blackheads", "Pimples", "Painful lumps under skin"],
        treatments: ["Benzoyl peroxide", "Salicylic acid", "Retinoids", "Antibiotics"],
        imageUrl: "https://example.com/images/acne.jpg"
      },
      {
        name: "Rosacea",
        description: "A long-term skin condition affecting the face.",
        symptoms: ["Facial redness", "Swollen red bumps", "Eye problems", "Enlarged nose"],
        treatments: ["Topical gels", "Oral antibiotics", "Laser therapy", "Avoiding triggers"],
        imageUrl: "https://example.com/images/rosacea.jpg"
      },
      {
        name: "Basal Cell Carcinoma",
        description: "A type of skin cancer beginning in the basal cells.",
        symptoms: ["Pearly or waxy bump", "Flat scar-like lesion", "Bleeding or scabbing sore"],
        treatments: ["Mohs surgery", "Curettage and electrodesiccation", "Cryotherapy"],
        imageUrl: "https://example.com/images/bcc.jpg"
      },
      {
        name: "Actinic Keratosis",
        description: "A rough scaly patch from years of sun exposure.",
        symptoms: ["Rough dry scaly patch", "Flat to slightly raised bump", "Itching or burning"],
        treatments: ["Cryotherapy", "Topical creams (Fluorouracil)", "Photodynamic therapy"],
        imageUrl: "https://example.com/images/ak.jpg"
      },
      {
        name: "Squamous Cell Carcinoma",
        description: "Skin cancer in the squamous cells.",
        symptoms: ["Firm red nodule", "Flat lesion with scaly surface", "New sore on old scar"],
        treatments: ["Excisional surgery", "Mohs surgery", "Radiation therapy"],
        imageUrl: "https://example.com/images/scc.jpg"
      }
    ];

    await ClinicalMedication.bulkCreate(medications);
    await ClinicalDisease.bulkCreate(diseases);

    console.log("✅ Clinical Resources Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding resources: ${error.message}`);
    process.exit(1);
  }
};

seedData();
