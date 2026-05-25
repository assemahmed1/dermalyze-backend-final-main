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

    // Fetch previous analyses to determine the stage and get the last image for comparison
    const previousAnalyses = await Analysis.findAll({
      where: { patientId: patient.id },
      order: [["createdAt", "DESC"]]
    });

    let stageLabel = "Initial";
    let previousImageUrl = null;

    if (previousAnalyses.length > 0) {
      stageLabel = `Follow up ${previousAnalyses.length}`;
      previousImageUrl = previousAnalyses[0].imageUrl;
    }

    // 1. Save to DB with status "processing" and null imageUrl initially
    const analysis = await Analysis.create({
      doctorId: req.user.id,
      patientId: patient.id,
      imageUrl: null,
      result: "Analysis in progress...",
      stage: stageLabel,
      severity: null,
      improvement: null,
      status: "processing"
    });

    // Note: We no longer return 201 immediately because the Flutter app 
    // expects the final analysis result synchronously.

    // 3. Spawn background worker to perform Cloudinary upload and Hugging Face analysis
    const worker = new Worker(path.join(__dirname, "../services/analysisWorker.js"), {
      workerData: {
        imageBuffer: req.file.buffer,
        previousImageUrl: previousImageUrl
      }
    });

    worker.on("message", async (message) => {
      try {
        if (message.success) {
          // Update DB with results and permanent URL
          analysis.imageUrl = message.imageUrl;
          analysis.result = message.result;
          analysis.severity = message.severity;
          analysis.improvement = message.improvement;
          analysis.status = "completed";
          await analysis.save();

          // Extract diagnosis and confidence
          let diag = analysis.result;
          let conf = 0.95;
          const match = analysis.result.match(/(.*) \(([\d.]+)% confidence\)/);
          if (match) {
            diag = match[1];
            conf = parseFloat(match[2]) / 100;
          }

          // Return synchronous response matching Flutter app expectations
          res.status(200).json({
            success: true,
            patientId: analysis.patientId.toString(),
            patientName: patient.name,
            diagnosis: diag,
            confidence: conf,
            severity: analysis.severity,
            improvement: analysis.improvement,
            recommendation: "Continue current treatment plan",
            affectedArea: "N/A",
            currentArea: "N/A",
            date: analysis.createdAt,
            previousSeverity: previousAnalyses.length > 0 ? previousAnalyses[0].severity || "N/A" : "N/A",
            analysis: analysis // keep original structure just in case
          });

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
              severity: analysis.severity,
              improvement: analysis.improvement,
              stage: analysis.stage,
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

          if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Analysis failed", error: message.error });
          }
        }
      } catch (err) {
        console.error("[MASTER PROCESS WORKER MESSAGE ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Server error during analysis", error: err.message });
        }
      }
    });

    worker.on("error", async (err) => {
      try {
        console.error("[MASTER PROCESS WORKER THREAD ERROR]", err);
        analysis.result = `Analysis thread crash: ${err.message}`;
        analysis.status = "failed";
        await analysis.save();
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Analysis thread crashed", error: err.message });
        }
      } catch (dbErr) {
        console.error("Error updating failed state after thread crash:", dbErr);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Server error", error: dbErr.message });
        }
      }
    });

  } catch (error) {
    console.error("[CREATE ANALYSIS CONTROLLER ERROR]", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getPatientAnalyses = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const analyses = await Analysis.findAll({ where: { patientId: patient.id } });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
