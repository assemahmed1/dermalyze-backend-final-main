require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ClinicalDisease = require("../models/ClinicalDisease");

const diseases = [
  {
    name: "Acne Vulgaris",
    description:
      "A chronic skin condition that occurs when hair follicles become plugged with oil and dead skin cells, causing inflammatory lesions.",
    symptoms: [
      "Whiteheads and pustules",
      "Papules and pus",
      "Facial redness",
      "Cystic lesions",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Actinic Keratosis",
    description:
      "A precancerous rough, scaly patch on the skin caused by years of sun exposure, which can sometimes progress to squamous cell carcinoma.",
    symptoms: [
      "Rough scaly patches",
      "Flat or raised discoloration",
      "Bleeding or crusting",
      "Itchy or burning",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Atopic Dermatitis",
    description:
      "A chronic inflammatory skin condition characterized by intense itching and recurring eczematous lesions, commonly associated with allergic disease.",
    symptoms: [
      "Dry itchy skin",
      "Red or brownish patches",
      "Small raised bumps",
      "Thickened cracked skin",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Cellulitis/Impetigo",
    description:
      "A bacterial skin infection affecting the deeper layers of skin (cellulitis) or presenting as a highly contagious superficial infection with honey-colored crusts (impetigo).",
    symptoms: [
      "Red swollen warm skin",
      "Honey-colored crust",
      "Pain and tenderness",
      "Fever and chills",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Eczema/Dermatitis",
    description:
      "A group of conditions causing itchy, inflamed skin. Symptoms vary by type but commonly include dry, sensitive skin with red or brownish patches.",
    symptoms: [
      "Itchy inflamed skin",
      "Dry and sensitive",
      "Red to brownish patches",
      "Oozing and crusting",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Melanoma/Melanocytic",
    description:
      "The most serious form of skin cancer, developing in the melanocytes. Early detection is critical as it can spread rapidly to other organs.",
    symptoms: [
      "Asymmetrical mole",
      "Irregular ragged border",
      "Multiple colors",
      "Changing size or shape",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Psoriasis/Lichen",
    description:
      "A chronic autoimmune condition where the immune system speeds up skin cell growth, leading to red, scaly plaques and thickened skin.",
    symptoms: [
      "Red patches with scales",
      "Dry cracked skin",
      "Itching burning",
      "Thickened or ridged nails",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Tinea/Candida",
    description:
      "A fungal skin infection that can present as ringworm (tinea) or yeast overgrowth (candida), affecting the skin, nails, and mucous membranes.",
    symptoms: [
      "Ring-shaped red scaly patches",
      "Itchy skin",
      "Cracking between toes",
      "White patches in skin folds",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Urticaria",
    description:
      "An allergic skin reaction that causes raised, itchy welts (hives) on the skin surface, triggered by allergens, stress, or infections.",
    symptoms: [
      "Raised itchy welts",
      "Red or skin-colored welts",
      "Swelling of lips or eyes",
      "Burning or stinging",
    ],
    treatments: [],
    imageUrl: "",
  },
  {
    name: "Verruca Vulgaris",
    description:
      "A viral skin infection caused by the human papillomavirus (HPV), presenting as small rough warts or molluscum contagiosum bumps.",
    symptoms: [
      "Small rough raised bumps",
      "Flesh-colored or white",
      "Clusters of small bumps",
      "Itching around area",
    ],
    treatments: [],
    imageUrl: "",
  },
];

const seedDiseases = async () => {
  try {
    await connectDB();

    const result = await ClinicalDisease.insertMany(diseases, {
      ordered: false,
    });

    console.log(
      `✅ Successfully seeded ${result.length} skin disease(s) into the database.`
    );
    process.exit(0);
  } catch (error) {
    // ordered: false — some docs may have inserted before a duplicate key error
    if (error.code === 11000 || error.name === "BulkWriteError") {
      const inserted = error.result?.nInserted ?? error.insertedCount ?? 0;
      console.warn(
        `⚠️  Partial insert: ${inserted} disease(s) inserted. Duplicates were skipped.`
      );
      console.warn(`   Duplicate key detail: ${error.message}`);
      process.exit(0);
    }

    console.error(`❌ Error seeding diseases: ${error.message}`);
    process.exit(1);
  }
};

seedDiseases();
