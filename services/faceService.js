const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Compare face in ID photo with selfie
async function compareFaces(idImageBuffer, selfieImageBuffer) {
  const idPath = path.join(os.tmpdir(), `id_${Date.now()}.jpg`);
  const selfiePath = path.join(os.tmpdir(), `selfie_${Date.now()}.jpg`);

  fs.writeFileSync(idPath, idImageBuffer);
  fs.writeFileSync(selfiePath, selfieImageBuffer);

  return new Promise((resolve) => {
    execFile(
      "python3",
      [path.join(__dirname, "../scripts/compareFaces.py"), idPath, selfiePath],
      (error, stdout, stderr) => {
        fs.unlinkSync(idPath);
        fs.unlinkSync(selfiePath);

        if (error) {
          console.error("Face comparison error:", stderr);
          return resolve({ match: false, similarity: 0, message: "Face verification service error" });
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ match: false, similarity: 0, message: "Could not parse result" });
        }
      }
    );
  });
}

// Check for doctor profession keyword in ID back
async function checkDoctorOnId(idBackImageBuffer) {
  const idBackPath = path.join(os.tmpdir(), `idback_${Date.now()}.jpg`);
  fs.writeFileSync(idBackPath, idBackImageBuffer);

  return new Promise((resolve) => {
    execFile(
      "python3",
      [path.join(__dirname, "../scripts/checkDoctorId.py"), idBackPath],
      (error, stdout, stderr) => {
        fs.unlinkSync(idBackPath);

        if (error) {
          console.error("OCR error:", stderr);
          return resolve({ isDoctor: false, message: "OCR service error" });
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ isDoctor: false, message: "Could not parse OCR result" });
        }
      }
    );
  });
}

async function loadModels() {
  console.log("✅ Face verification ready (Python-based)");
}

module.exports = { compareFaces, checkDoctorOnId, loadModels };
