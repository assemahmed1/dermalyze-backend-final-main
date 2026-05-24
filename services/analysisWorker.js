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

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "dermalyze/analyses", transformation: [{ width: 1024, height: 1024, crop: "limit" }] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function analyzeSkin(imageBuffer) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error("API configuration missing");
  
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/Anwarkh1/Skin_Cancer-Image_Classification",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/octet-stream"
      },
      body: imageBuffer
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) throw new Error("Invalid API token");
    if (response.status === 503) throw new Error("Model loading, please wait...");
    throw new Error(`Analysis error (${response.status})`);
  }
  
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    const top = data[0];
    return `${top.label} (${(top.score * 100).toFixed(1)}% confidence)`;
  }
  throw new Error("Unable to analyze image");
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function runPythonInference(currPath, prevPath) {
  return new Promise((resolve, reject) => {
    const args = [path.join(__dirname, "../scripts/inference.py")];
    if (prevPath) args.push(prevPath);
    args.push(currPath);

    const py = spawn("python3", args);
    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => { stdout += data.toString(); });
    py.stderr.on("data", (data) => { stderr += data.toString(); });

    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr));
      
      const parts = stdout.trim().split(",");
      if (parts.length === 1) {
        resolve({ severityScore: parseFloat(parts[0]), improvementStr: null });
      } else if (parts.length === 3) {
        const improvement = parseFloat(parts[2]);
        let improvementStr = "No change";
        if (improvement > 0) improvementStr = `+${improvement}% improvement`;
        else if (improvement < 0) improvementStr = `${improvement}% deterioration`;
        resolve({ severityScore: parseFloat(parts[1]), improvementStr });
      } else {
        reject(new Error("Unexpected python output: " + stdout));
      }
    });
  });
}

function getSeverityLabel(score) {
  if (score < 0.33) return "Low";
  if (score <= 0.66) return "Medium";
  return "High";
}

async function run() {
  let currPath = null;
  let prevPath = null;

  try {
    const buffer = Buffer.from(workerData.imageBuffer);
    
    // Save current image to temp file
    currPath = path.join(os.tmpdir(), `curr_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
    fs.writeFileSync(currPath, buffer);

    // Download previous image if available
    if (workerData.previousImageUrl) {
      prevPath = path.join(os.tmpdir(), `prev_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
      await downloadImage(workerData.previousImageUrl, prevPath);
    }

    const [uploadResult, aiResult, inferenceResult] = await Promise.all([
      uploadToCloudinary(buffer),
      analyzeSkin(buffer),
      runPythonInference(currPath, prevPath)
    ]);
    
    parentPort.postMessage({
      success: true,
      imageUrl: uploadResult.secure_url,
      result: aiResult,
      severity: getSeverityLabel(inferenceResult.severityScore),
      improvement: inferenceResult.improvementStr
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Unknown worker error"
    });
  } finally {
    // Cleanup temporary files
    try { if (currPath && fs.existsSync(currPath)) fs.unlinkSync(currPath); } catch (_) {}
    try { if (prevPath && fs.existsSync(prevPath)) fs.unlinkSync(prevPath); } catch (_) {}
  }
}

run();
