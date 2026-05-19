// scripts/uploadDiseaseImages.js
// Uploads all 14 AI-generated disease images to Cloudinary and updates the DB

require("dotenv").config();
const cloudinary = require("../config/cloudinary");
const { sequelize } = require("../config/db");
const path = require("path");
const fs = require("fs");

const BRAIN_DIR = "/Users/assemahmed/.gemini/antigravity/brain/193d8193-986f-42fc-b217-a801a99ed701";

// Map each disease name (as stored in DB) to its generated image file
const diseaseImages = [
  { name: "Eczema",                          file: "disease_eczema_1779158515463.png" },
  { name: "Psoriasis",                        file: "disease_psoriasis_1779158542105.png" },
  { name: "Acne",                             file: "disease_acne_1779158566922.png" },
  { name: "Rosacea",                          file: "disease_rosacea_1779158595653.png" },
  { name: "Vitiligo",                         file: "disease_vitiligo_1779158624872.png" },
  { name: "Acne & Rosacea",                  file: "disease_acne_rosacea_1779159199168.png" },
  { name: "Actinic Keratosis & Skin Cancer", file: "disease_actinic_keratosis_1779158921947.png" },
  { name: "Atopic Dermatitis",               file: "disease_atopic_dermatitis_1779159063545.png" },
  { name: "Cellulitis & Impetigo",           file: "disease_cellulitis_1779158826369.png" },
  { name: "Melanoma & Moles",                file: "disease_melanoma_1779158664805.png" },
  { name: "Psoriasis & Lichen Planus",       file: "disease_psoriasis_lichen_planus_1779159134212.png" },
  { name: "Tinea & Fungal Infections",       file: "disease_tinea_1779158720269.png" },
  { name: "Urticaria (Hives)",               file: "disease_urticaria_1779158757093.png" },
  { name: "Warts & Viral Infections",        file: "disease_warts_1779158874931.png" },
];

async function upload(filePath, diseaseName) {
  const slug = diseaseName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "dermalyze/diseases",
    public_id: slug,
    overwrite: true,
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
  });
  return result.secure_url;
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected\n");

    // Add imageUrl column if it doesn't exist (MySQL-compatible check)
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Diseases' AND COLUMN_NAME = 'imageUrl'
    `);
    if (cols.length === 0) {
      await sequelize.query(`ALTER TABLE Diseases ADD COLUMN imageUrl VARCHAR(500) NULL`);
      console.log("✅ imageUrl column added\n");
    } else {
      console.log("✅ imageUrl column already exists\n");
    }

    let uploaded = 0;
    for (const { name, file } of diseaseImages) {
      const filePath = path.join(BRAIN_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${file}`);
        continue;
      }

      process.stdout.write(`📤 Uploading "${name}"... `);
      try {
        const url = await upload(filePath, name);
        await sequelize.query(
          `UPDATE Diseases SET imageUrl = :url WHERE name = :name`,
          { replacements: { url, name } }
        );
        console.log(`✅ ${url.slice(0, 60)}...`);
        uploaded++;
      } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
      }
    }

    console.log(`\n🎉 Done! ${uploaded}/${diseaseImages.length} images uploaded and saved to DB.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
})();
