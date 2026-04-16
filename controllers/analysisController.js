const Analysis = require("../models/Analysis");
const Patient = require("../models/Patient");
const cloudinary = require("../config/cloudinary");

// Upload image to Cloudinary from buffer
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

// Analyze image using Hugging Face AI
async function analyzeSkin(imageBuffer) {
  try {
    const token = process.env.HF_API_TOKEN;
    
    if (!token) {
      console.error("CRITICAL: HF_API_TOKEN is missing in environment variables!");
      return "Analysis error: API configuration missing";
    }
    
    console.log(`AI Analysis (Direct) attempting with token: ${token.substring(0, 4)}****`);

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Anwarkh1/Skin_Disease_Classification",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream"
        },
        body: imageBuffer
      }
    );

    // 🔍 Capture exact status and body for debugging
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face Direct API Error (${response.status}):`, errorText.substring(0, 200));
      
      if (response.status === 401) return "Analysis error: Invalid API token";
      if (response.status === 503) return "Analysis error: Model loading, please wait...";
      return `Analysis error (${response.status})`;
    }

    const data = await response.json();

    // Get top prediction result
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      const confidence = (top.score * 100).toFixed(1);
      return `${top.label} (${confidence}% confidence)`;
    }

    return "Unable to analyze image";

  } catch (error) {
    console.error("Analysis connection failure:", error.message);
    return "Analysis service unavailable";
  }
}

// ================= CREATE ANALYSIS =================
exports.createAnalysis = async (req, res) => {
  try {
    const patientId = req.params.patientId;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Upload to Cloudinary and run AI analysis simultaneously
    const [uploadResult, aiResult] = await Promise.all([
      uploadToCloudinary(req.file.buffer),
      analyzeSkin(req.file.buffer)
    ]);

    const analysis = await Analysis.create({
      doctor: req.user.id,
      patient: patientId,
      imageUrl: uploadResult.secure_url,
      result: aiResult
    });

    res.status(201).json({
      message: "Analysis added to patient file",
      analysis
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET PATIENT ANALYSES =================
exports.getPatientAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find({ patient: req.params.patientId });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
