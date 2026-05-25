const { parentPort, workerData } = require("worker_threads");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");

// Configure Cloudinary inside the worker
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cloudinary Upload ────────────────────────────────────────────────────────
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "dermalyze/analyses",
        transformation: [{ width: 1024, height: 1024, crop: "limit" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// The AI model is strictly for measuring severity and improvement.
// The diagnosis label is provided by the doctor in the patient's medical record.

// ── Severity Label (Low / Medium / High) ─────────────────────────────────────
function getSeverityLabel(score) {
  if (score < 0.33) return "Low";
  if (score <= 0.66) return "Medium";
  return "High";
}

// ── Download Previous Image ──────────────────────────────────────────────────
function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

// ── Python Inference (PyTorch ResNet-18 severity_model.pt) ──────────────────
function runPythonInference(currPath, prevPath) {
  return new Promise((resolve, reject) => {
    const args = [path.join(__dirname, "../scripts/inference.py")];
    if (prevPath) args.push(prevPath);
    args.push(currPath);

    const py = spawn("python3", args);
    let stdout = "";
    let stderr = "";

    // Timeout: kill Python process after 45 seconds if still running
    const timeout = setTimeout(() => {
      py.kill("SIGTERM");
      reject(new Error("Python inference timed out after 45 seconds"));
    }, 45000);

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(stderr || "Python process exited with code " + code));

      const parts = stdout.trim().split(",");
      if (parts.length === 1) {
        resolve({ severityScore: parseFloat(parts[0]), improvementStr: null, previousScore: null });
      } else if (parts.length === 3) {
        const improvement = parseFloat(parts[2]);
        let improvementStr = "No change";
        if (improvement > 0) improvementStr = `+${improvement.toFixed(1)}% improvement`;
        else if (improvement < 0) improvementStr = `${improvement.toFixed(1)}% deterioration`;
        resolve({
          severityScore: parseFloat(parts[1]),
          previousScore: parseFloat(parts[0]),
          improvementStr,
        });
      } else {
        reject(new Error("Unexpected python output: " + stdout));
      }
    });

    py.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ── Main Worker Function ─────────────────────────────────────────────────────
async function run() {
  let currPath = null;
  let prevPath = null;

  try {
    const buffer = Buffer.from(workerData.imageBuffer);

    // Save current image to temp file
    currPath = path.join(
      os.tmpdir(),
      `curr_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    );
    fs.writeFileSync(currPath, buffer);

    // Download previous image if this is a follow-up scan
    if (workerData.previousImageUrl) {
      prevPath = path.join(
        os.tmpdir(),
        `prev_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      );
      await downloadImage(workerData.previousImageUrl, prevPath);
    }

    // Run Cloudinary upload and PyTorch inference in parallel
    const [uploadResult, inferenceResult] = await Promise.all([
      uploadToCloudinary(buffer),
      runPythonInference(currPath, prevPath),
    ]);

    // Use the doctor's predefined diagnosis from the patient record
    const doctorDiagnosis = workerData.patientDiagnosis || "Skin Condition Analysis";

    parentPort.postMessage({
      success: true,
      imageUrl: uploadResult.secure_url,
      result: doctorDiagnosis, // Only store the diagnosis name in DB
      diagnosisLabel: doctorDiagnosis,
      confidenceScore: null, // AI confidence is removed as per business logic
      recommendation: "Review the improvement percentage to adjust the treatment plan accordingly.",
      severity: getSeverityLabel(inferenceResult.severityScore),
      severityScore: inferenceResult.severityScore,
      previousScore: inferenceResult.previousScore,
      improvement: inferenceResult.improvementStr,
      isFirstScan: !workerData.previousImageUrl,
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Unknown worker error",
    });
  } finally {
    // Cleanup temporary files
    try {
      if (currPath && fs.existsSync(currPath)) fs.unlinkSync(currPath);
    } catch (_) {}
    try {
      if (prevPath && fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
    } catch (_) {}
  }
}

run();
