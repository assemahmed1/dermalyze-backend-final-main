const { HfInference } = require("@huggingface/inference");
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
    
    // 🔍 Diagnostic Check: Verify token exists
    if (!token) {
      console.error("CRITICAL: HF_API_TOKEN is missing in environment variables!");
      return "Analysis error: API configuration missing";
    }
    
    // Log sanitized token for debugging (First 4 chars)
    console.log(`AI Analysis SDK attempting with token: ${token.substring(0, 4)}****`);

    const hf = new HfInference(token);
    
    // 🚀 Use hf.request for a more direct and reliable connection (bypasses provider mapping)
    const data = await hf.request({
      model: "Ismail-Amroune/skin-diseases-classification",
      data: imageBuffer,
      task: "image-classification"
    });

    // Handle SDK response (typically an array of {label, score})
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      const confidence = (top.score * 100).toFixed(1);
      return `${top.label} (${confidence}% confidence)`;
    }

    return "Unable to analyze image";

  } catch (error) {
    console.error("Hugging Face SDK error:", error.message);
    
    // Specific error handling for common issues
    if (error.message.includes("404")) {
      return "Analysis error: Model endpoint unavailable (404)";
    }
    if (error.message.includes("401")) {
      return "Analysis error: Invalid API token (401)";
    }
    
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
