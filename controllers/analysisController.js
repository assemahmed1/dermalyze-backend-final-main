const Analysis = require("../models/Analysis");
const Patient = require("../models/Patient");
const cloudinary = require("../config/cloudinary");

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
  try {
    const token = process.env.HF_API_TOKEN;
    if (!token) return "Analysis error: API configuration missing";
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Anwarkh1/Skin_Cancer-Image_Classification",
      { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/octet-stream" }, body: imageBuffer }
    );
    if (!response.ok) {
      if (response.status === 401) return "Analysis error: Invalid API token";
      if (response.status === 503) return "Analysis error: Model loading, please wait...";
      return `Analysis error (${response.status})`;
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      return `${top.label} (${(top.score * 100).toFixed(1)}% confidence)`;
    }
    return "Unable to analyze image";
  } catch (error) {
    return "Analysis service unavailable";
  }
}

exports.createAnalysis = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    const patient = await Patient.findByPk(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const [uploadResult, aiResult] = await Promise.all([
      uploadToCloudinary(req.file.buffer),
      analyzeSkin(req.file.buffer)
    ]);
    const analysis = await Analysis.create({
      doctorId: req.user.id, patientId, imageUrl: uploadResult.secure_url, result: aiResult
    });
    res.status(201).json({ message: "Analysis added to patient file", analysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPatientAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.findAll({ where: { patientId: req.params.patientId } });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
