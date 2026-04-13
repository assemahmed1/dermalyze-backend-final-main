/**
 * Script to download face-api models
 * Run once: node scripts/downloadModels.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "../models/face");
const BASE_URL = "https://raw.githubusercontent.com/vladmandic/face-api/master/model";

const FILES = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

function download(file) {
  return new Promise((resolve, reject) => {
    const dest = path.join(MODELS_DIR, file);
    if (fs.existsSync(dest)) {
      console.log(`✅ Already exists: ${file}`);
      return resolve();
    }

    const out = fs.createWriteStream(dest);
    https.get(`${BASE_URL}/${file}`, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => {
          res2.pipe(out);
          out.on("finish", () => { console.log(`⬇️  Downloaded: ${file}`); resolve(); });
        }).on("error", reject);
      } else {
        res.pipe(out);
        out.on("finish", () => { console.log(`⬇️  Downloaded: ${file}`); resolve(); });
      }
    }).on("error", reject);
  });
}

(async () => {
  console.log("📥 Downloading face-api models...\n");
  for (const file of FILES) {
    await download(file);
  }
  console.log("\n✅ All models downloaded successfully!");
})();
