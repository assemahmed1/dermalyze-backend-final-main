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
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Anwarkh1/Skin_Disease_Classification",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/octet-stream"
        },
        body: imageBuffer
      }
    );

    const data = await response.json();

    // Handle model loading or error response
    if (data.error) {
      return `Analysis pending: ${data.error}`;
    }

    // Get top prediction result
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      const confidence = (top.score * 100).toFixed(1);
      return `${top.label} (${confidence}% confidence)`;
    }

    return "Unable to analyze image";

  } catch (error) {
    console.error("Hugging Face API error:", error.message);
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
