const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Compare face in ID photo with selfie
async function compareFaces(idImageBuffer, selfieImageBuffer) {
  const idPath = path.join(os.tmpdir(), `id_${Date.now()}.jpg`);
  const selfiePath = path.join(os.tmpdir(), `selfie_${Date.now()}.jpg`);

  try {
    fs.writeFileSync(idPath, idImageBuffer);
    fs.writeFileSync(selfiePath, selfieImageBuffer);
  } catch (err) {
    console.error("Failed to write face verification temp files:", err);
    try {
      if (fs.existsSync(idPath)) fs.unlinkSync(idPath);
      if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
    } catch (_) {}
    return { match: false, similarity: 0, message: "Server temporary file creation failed" };
  }

  return new Promise((resolve) => {
    execFile(
      "python3",
      [path.join(__dirname, "../scripts/compareFaces.py"), idPath, selfiePath],
      (error, stdout, stderr) => {
        // Guarantee file cleanup
        try {
          if (fs.existsSync(idPath)) fs.unlinkSync(idPath);
          if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
        } catch (cleanupError) {
          console.error("Failed to delete face verification temp files:", cleanupError);
        }

        if (error) {
          console.error("Face comparison error:", stderr);
          return resolve({ match: false, similarity: 0, message: `Face verification error: ${stderr}` });
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

  try {
    fs.writeFileSync(idBackPath, idBackImageBuffer);
  } catch (err) {
    console.error("Failed to write doctor ID temp file:", err);
    try {
      if (fs.existsSync(idBackPath)) fs.unlinkSync(idBackPath);
    } catch (_) {}
    return { isDoctor: false, message: "Server temporary file creation failed" };
  }

  return new Promise((resolve) => {
    execFile(
      "python3",
      [path.join(__dirname, "../scripts/checkDoctorId.py"), idBackPath],
      (error, stdout, stderr) => {
        // Guarantee file cleanup
        try {
          if (fs.existsSync(idBackPath)) fs.unlinkSync(idBackPath);
        } catch (cleanupError) {
          console.error("Failed to delete doctor ID temp file:", cleanupError);
        }

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
