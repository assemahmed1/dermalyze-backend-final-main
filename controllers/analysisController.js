const Analysis = require("../models/Analysis");
const Patient = require("../models/Patient");
const { getOrCreatePatient } = require("../utils/patientUtils");
const { Worker } = require("worker_threads");
const path = require("path");

exports.createAnalysis = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // 1. Save to DB with status "processing" and null imageUrl initially
    const analysis = await Analysis.create({
      doctorId: req.user.id,
      patientId,
      imageUrl: null,
      result: "Analysis in progress...",
      status: "processing"
    });

    // 2. Return HTTP response immediately without blocking
    res.status(201).json({
      success: true,
      message: "Analysis started in background",
      analysis
    });

    // 3. Spawn background worker to perform Cloudinary upload and Hugging Face analysis
    const worker = new Worker(path.join(__dirname, "../services/analysisWorker.js"), {
      workerData: {
        imageBuffer: req.file.buffer
      }
    });

    worker.on("message", async (message) => {
      try {
        if (message.success) {
          // Update DB with results and permanent URL
          analysis.imageUrl = message.imageUrl;
          analysis.result = message.result;
          analysis.status = "completed";
          await analysis.save();

          // Emit real-time Socket.io event to Doctor and Patient rooms
          const { getIO } = require("../services/socketHandler");
          const io = getIO();
          if (io) {
            const payload = {
              _id: analysis.id.toString(),
              id: analysis.id.toString(),
              patientId: analysis.patientId.toString(),
              doctorId: analysis.doctorId.toString(),
              imageUrl: analysis.imageUrl,
              result: analysis.result,
              status: "completed",
              createdAt: analysis.createdAt
            };
            io.to(String(analysis.doctorId)).emit("analysis_completed", payload);
            io.to(String(analysis.patientId)).emit("analysis_completed", payload);
            console.log(`📡 Emitted analysis_completed Socket event for Analysis ID ${analysis.id}`);
          }
        } else {
          analysis.result = `Analysis failed: ${message.error}`;
          analysis.status = "failed";
          await analysis.save();

          // Emit failure event
          const { getIO } = require("../services/socketHandler");
          const io = getIO();
          if (io) {
            io.to(String(analysis.doctorId)).emit("analysis_failed", {
              id: analysis.id.toString(),
              patientId: analysis.patientId.toString(),
              error: message.error
            });
          }
        }
      } catch (err) {
        console.error("[MASTER PROCESS WORKER MESSAGE ERROR]", err);
      }
    });

    worker.on("error", async (err) => {
      try {
        console.error("[MASTER PROCESS WORKER THREAD ERROR]", err);
        analysis.result = `Analysis thread crash: ${err.message}`;
        analysis.status = "failed";
        await analysis.save();
      } catch (dbErr) {
        console.error("Error updating failed state after thread crash:", dbErr);
      }
    });

  } catch (error) {
    console.error("[CREATE ANALYSIS CONTROLLER ERROR]", error);
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
