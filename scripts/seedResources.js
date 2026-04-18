require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ClinicalMedication = require("../models/ClinicalMedication");
const ClinicalDisease = require("../models/ClinicalDisease");

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await ClinicalMedication.deleteMany({});
    await ClinicalDisease.deleteMany({});

    // 1) Seed Medications
    const medications = [
      {
        name: "Methotrexate",
        category: "Immunosuppressant",
        description: "A medicine used to treat severe psoriasis and certain types of arthritis.",
        uses: ["Severe Psoriasis", "Rheumatoid Arthritis"],
        sideEffects: ["Nausea", "Fatigue", "Hair thinning", "Mouth sores"],
        dosage: "Typically 7.5mg to 25mg taken once weekly."
      },
      {
        name: "Tretinoin (Retin-A)",
        category: "Retinoid",
        description: "A topical form of vitamin A used to treat acne and sun-damaged skin.",
        uses: ["Acne Vulgaris", "Fine wrinkles", "Skin hyperpigmentation"],
        sideEffects: ["Skin peeling", "Redness", "Dryness", "Photosensitivity"],
        dosage: "Apply a thin layer to affected area once daily before bedtime."
      },
      {
        name: "Hydrocortisone Cream",
        category: "Corticosteroid",
        description: "A mild topical steroid used to reduce skin inflammation and itching.",
        uses: ["Eczema", "Insect bites", "Dermatitis", "Rashes"],
        sideEffects: ["Skin thinning (with long-term use)", "Stinging", "Irritation"],
        dosage: "Apply to affected area 2-3 times daily."
      },
      {
        name: "Adapalene (Differin)",
        category: "Retinoid-like",
        description: "A third-generation topical retinoid primarily used for mild-to-moderate acne.",
        uses: ["Acne", "Blackheads", "Whiteheads"],
        sideEffects: ["Redness", "Scaling", "Burning sensation"],
        dosage: "Apply once daily to the entire face after washing."
      },
      {
        name: "Ketoconazole",
        category: "Antifungal",
        description: "Used to treat fungal infections of the skin such as athlete's foot and dandruff.",
        uses: ["Seborrheic dermatitis", "Pityriasis versicolor", "Athlete's foot"],
        sideEffects: ["Itching", "Irritation", "Dry skin"],
        dosage: "Apply to the affected skin or scalp once or twice daily."
      }
    ];

    // 2) Seed Diseases (Focus on AI detectable ones)
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
        symptoms: ["Red patches of skin with thick silvery scales", "Dry, cracked skin", "Itching or burning"],
        treatments: ["Topical corticosteroids", "Phototherapy", "Biologic medications", "Moisturizers"],
        imageUrl: "https://example.com/images/psoriasis.jpg"
      },
      {
        name: "Eczema (Atopic Dermatitis)",
        description: "A condition that makes your skin red and itchy. It's common in children but can occur at any age.",
        symptoms: ["Dry skin", "Itching", "Red to brownish-gray patches", "Small raised bumps"],
        treatments: ["Moisturizing regularly", "Topical steroids", "Avoiding triggers", "Antihistamines"],
        imageUrl: "https://example.com/images/eczema.jpg"
      },
      {
        name: "Acne Vulgaris",
        description: "A common skin condition that occurs when hair follicles become plugged with oil and dead skin cells.",
        symptoms: ["Whiteheads", "Blackheads", "Pimples", "Painful lumps under the skin"],
        treatments: ["Benzoyl peroxide", "Salicylic acid", "Retinoids", "Antibiotics"],
        imageUrl: "https://example.com/images/acne.jpg"
      },
      {
        name: "Rosacea",
        description: "A long-term skin condition that typically affects the face, causing redness, visible blood vessels, and small, red, pus-filled bumps.",
        symptoms: ["Facial redness", "Swollen red bumps", "Eye problems", "Enlarged nose"],
        treatments: ["Topical gels", "Oral antibiotics", "Laser therapy", "Avoiding triggers (spicy food, alcohol)"],
        imageUrl: "https://example.com/images/rosacea.jpg"
      },
      {
        name: "Basal Cell Carcinoma",
        description: "A type of skin cancer that begins in the basal cells. It often appears as a slightly transparent bump on the skin.",
        symptoms: ["Pearly or waxy bump", "Flat, flesh-colored or brown scar-like lesion", "Bleeding or scabbing sore"],
        treatments: ["Mohs surgery", "Curettage and electrodesiccation", "Cryotherapy"],
        imageUrl: "https://example.com/images/bcc.jpg"
      },
      {
        name: "Actinic Keratosis",
        description: "A rough, scaly patch on the skin that develops from years of sun exposure. Can sometimes turn into squamous cell carcinoma.",
        symptoms: ["Rough, dry, or scaly patch", "Flat to slightly raised bump", "Itching or burning in the affected area"],
        treatments: ["Cryotherapy", "Topical creams (Fluorouracil)", "Photodynamic therapy"],
        imageUrl: "https://example.com/images/ak.jpg"
      },
      {
        name: "Squamous Cell Carcinoma",
        description: "A common form of skin cancer that develops in the squamous cells that make up the middle and outer layers of the skin.",
        symptoms: ["Firm, red nodule", "Flat lesion with a scaly, crusted surface", "New sore on an old scar"],
        treatments: ["Excisional surgery", "Mohs surgery", "Radiation therapy"],
        imageUrl: "https://example.com/images/scc.jpg"
      }
    ];

    await ClinicalMedication.insertMany(medications);
    await ClinicalDisease.insertMany(diseases);

    console.log("✅ Clinical Resources Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding resources: ${error.message}`);
    process.exit(1);
  }
};

seedData();
