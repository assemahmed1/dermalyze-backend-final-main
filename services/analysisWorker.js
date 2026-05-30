const { parentPort, workerData } = require("worker_threads");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// ── Severity Label (Low / Medium / High) ─────────────────────────────────────
function getSeverityLabel(score) {
  if (score < 0.33) return "Low";
  if (score <= 0.66) return "Medium";
  return "High";
}

// ── Download Previous Image from URL ─────────────────────────────────────────
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

// ── Helper: Read image as inlineData ─────────────────────────────────────────
function getMimeType(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "image/webp";
  return "image/jpeg"; // fallback
}

function imageToInlineData(filePath) {
  const base64 = fs.readFileSync(filePath).toString("base64");
  const mimeType = getMimeType(filePath);
  return { inlineData: { data: base64, mimeType } };
}

// ── PRIMARY: Gemini 1.5 Flash Analysis ───────────────────────────────────────
async function runGeminiAnalysis(currPath, prevPath, patientDiagnosis) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const currPart = imageToInlineData(currPath);

  let prompt;
  let parts;

  if (prevPath) {
    // ── Follow-up scan: compare two images ───────────────────────────────────
    const prevPart = imageToInlineData(prevPath);

    prompt = `You are a medical AI assistant specializing in dermatology. 
The patient has been diagnosed by their doctor with: "${patientDiagnosis}".

You are given TWO skin images:
- Image 1 (PREVIOUS): The earlier photo of the skin condition.
- Image 2 (CURRENT): The more recent photo taken during a follow-up visit.

Your ONLY task is to measure the visual improvement or deterioration of the skin between the two images.
Do NOT re-diagnose the patient. Do NOT suggest any new conditions.

Analyze:
1. Changes in redness, inflammation, or irritation.
2. Changes in the number or size of lesions.
3. Changes in skin texture and overall appearance.

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "improvementPercent": <number between -100 and 100, positive = improvement, negative = deterioration>,
  "severityScore": <number between 0.0 and 1.0 for the CURRENT image, where 0=clear, 1=severe>,
  "severity": "<Low|Medium|High>",
  "summary": "<one sentence describing the change>"
}`;

    parts = [
      { text: "Image 1 (PREVIOUS):" },
      prevPart,
      { text: "Image 2 (CURRENT):" },
      currPart,
      { text: prompt },
    ];
  } else {
    // ── First scan: analyze single image ─────────────────────────────────────
    prompt = `You are a medical AI assistant specializing in dermatology.
The patient has been diagnosed by their doctor with: "${patientDiagnosis}".

This is the FIRST scan of the patient's skin. There is no previous image to compare against.

Your ONLY task is to assess the current severity of the skin condition visible in this image.
Do NOT re-diagnose the patient. Do NOT suggest any new conditions.

Analyze the current severity based on: redness, inflammation, number and size of lesions, and overall skin texture.

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "improvementPercent": null,
  "severityScore": <number between 0.0 and 1.0, where 0=clear, 1=severe>,
  "severity": "<Low|Medium|High>",
  "summary": "<one sentence describing the current condition>"
}`;

    parts = [currPart, { text: prompt }];
  }

  // Set a 30-second timeout using AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const result = await model.generateContent({ 
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" }
    });
    clearTimeout(timeout);

    const text = result.response.text().trim();

    // Strip any accidental markdown code fences
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const improvementPercent = parsed.improvementPercent;
    let improvementStr = null;
    if (improvementPercent !== null && improvementPercent !== undefined) {
      if (improvementPercent > 0) {
        improvementStr = `+${improvementPercent.toFixed(1)}% improvement`;
      } else if (improvementPercent < 0) {
        improvementStr = `${improvementPercent.toFixed(1)}% deterioration`;
      } else {
        improvementStr = "No change";
      }
    }

    return {
      severityScore: parsed.severityScore ?? 0.5,
      severity: parsed.severity ?? getSeverityLabel(parsed.severityScore ?? 0.5),
      improvementStr,
      summary: parsed.summary ?? "",
      source: "gemini",
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── FALLBACK: Hugging Face Analysis ──────────────────────────────────────────
async function runHuggingFaceAnalysis(currPath, prevPath, patientDiagnosis) {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) throw new Error("HF_API_TOKEN is not set");

  const currBuffer = fs.readFileSync(currPath);

  // HuggingFace: use skin lesion classification model as severity proxy
  const hfResponse = await fetch(
    "https://api-inference.huggingface.co/models/dima806/skin_types_image_detection",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: currBuffer,
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!hfResponse.ok) {
    const errorText = await hfResponse.text();
    throw new Error(`HuggingFace API error ${hfResponse.status}: ${errorText}`);
  }

  const hfData = await hfResponse.json();

  // Map HF confidence scores to a severity score (0.0–1.0)
  let severityScore = 0.5; // default
  if (Array.isArray(hfData) && hfData.length > 0) {
    // Take the top label score as a proxy for severity (higher confidence = clearer classification)
    severityScore = Math.min(Math.max(1 - hfData[0].score, 0.1), 0.9);
  }

  // If we have a previous image, compute a basic improvement from the two HF calls
  let improvementStr = null;
  if (prevPath) {
    const prevBuffer = fs.readFileSync(prevPath);
    const prevHfResponse = await fetch(
      "https://api-inference.huggingface.co/models/dima806/skin_types_image_detection",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: prevBuffer,
        signal: AbortSignal.timeout(30000),
      }
    );

    if (prevHfResponse.ok) {
      const prevData = await prevHfResponse.json();
      const prevSeverityScore = Array.isArray(prevData) && prevData.length > 0
        ? Math.min(Math.max(1 - prevData[0].score, 0.1), 0.9)
        : 0.5;

      // Min-Max normalize both scores to amplify small differences
      const MIN_VAL = 0.10, MAX_VAL = 0.90;
      const norm = (s) => (Math.min(Math.max(s, MIN_VAL), MAX_VAL) - MIN_VAL) / (MAX_VAL - MIN_VAL);
      const norm1 = norm(prevSeverityScore);
      const norm2 = norm(severityScore);

      const improvement = norm1 !== 0 ? ((norm1 - norm2) / norm1) * 100 : 0;
      const clamped = Math.min(Math.max(improvement, -100), 100);

      if (clamped > 0) improvementStr = `+${clamped.toFixed(1)}% improvement`;
      else if (clamped < 0) improvementStr = `${clamped.toFixed(1)}% deterioration`;
      else improvementStr = "No change";
    }
  }

  return {
    severityScore,
    severity: getSeverityLabel(severityScore),
    improvementStr,
    summary: "",
    source: "huggingface",
  };
}

// ── Main Worker Function ─────────────────────────────────────────────────────
async function run() {
  let currPath = null;
  let prevPath = null;

  try {
    const buffer = Buffer.from(workerData.imageBuffer);
    const patientDiagnosis = workerData.patientDiagnosis || "Skin Condition";

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

    // Run Cloudinary upload in parallel while we prepare for AI
    const uploadPromise = uploadToCloudinary(buffer);

    // ── Try Gemini first, fallback to HuggingFace on any error ───────────────
    let inferenceResult;
    try {
      inferenceResult = await runGeminiAnalysis(currPath, prevPath, patientDiagnosis);
      console.log("[AI] Gemini analysis successful.");
    } catch (geminiError) {
      console.error("[AI] Gemini failed, falling back to HuggingFace:", geminiError.message);
      try {
        inferenceResult = await runHuggingFaceAnalysis(currPath, prevPath, patientDiagnosis);
        console.log("[AI] HuggingFace fallback successful.");
      } catch (hfError) {
        console.error("[AI] HuggingFace fallback also failed:", hfError.message);
        // Last resort: return a basic result so the upload is not lost
        inferenceResult = {
          severityScore: 0.5,
          severity: "Medium",
          improvementStr: null,
          summary: "",
          source: "fallback-default",
        };
      }
    }

    const uploadResult = await uploadPromise;

    parentPort.postMessage({
      success: true,
      imageUrl: uploadResult.secure_url,
      result: patientDiagnosis,
      diagnosisLabel: patientDiagnosis,
      confidenceScore: null,
      recommendation: inferenceResult.summary
        ? inferenceResult.summary
        : "Review the improvement percentage to adjust the treatment plan accordingly.",
      severity: inferenceResult.severity,
      severityScore: inferenceResult.severityScore,
      improvement: inferenceResult.improvementStr,
      isFirstScan: !workerData.previousImageUrl,
      aiSource: inferenceResult.source,
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Unknown worker error",
    });
  } finally {
    // Cleanup temporary files
    try { if (currPath && fs.existsSync(currPath)) fs.unlinkSync(currPath); } catch (_) {}
    try { if (prevPath && fs.existsSync(prevPath)) fs.unlinkSync(prevPath); } catch (_) {}
  }
}

run();
