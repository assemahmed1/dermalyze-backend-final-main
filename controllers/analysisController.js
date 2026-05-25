const Analysis = require("../models/Analysis");
const { getOrCreatePatient } = require("../utils/patientUtils");
const { Worker } = require("worker_threads");
const path = require("path");

/**
 * POST /api/analysis/:patientId
 * Upload a skin image, run PyTorch + Cloudinary in a worker thread,
 * and return the complete analysis result synchronously so the Flutter
 * app can navigate to the result screen immediately.
 */
exports.createAnalysis = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Fetch previous analyses to determine stage and get the last image for comparison
    const previousAnalyses = await Analysis.findAll({
      where: { patientId: patient.id },
      order: [["createdAt", "DESC"]],
    });

    const isFirstScan = previousAnalyses.length === 0;
    const stageLabel = isFirstScan ? "Initial" : `Follow up ${previousAnalyses.length}`;
    const previousImageUrl = isFirstScan ? null : previousAnalyses[0].imageUrl;
    const previousSeverity = isFirstScan ? null : previousAnalyses[0].severity;

    // Create a placeholder DB record immediately
    const analysis = await Analysis.create({
      doctorId: req.user.id,
      patientId: patient.id,
      imageUrl: null,
      result: "Analysis in progress...",
      stage: stageLabel,
      severity: null,
      improvement: null,
      status: "processing",
    });

    // Spawn the worker thread (PyTorch + Cloudinary — no HuggingFace)
    const worker = new Worker(
      path.join(__dirname, "../services/analysisWorker.js"),
      {
        workerData: {
          imageBuffer: req.file.buffer,
          previousImageUrl,
        },
      }
    );

    // Overall timeout: if the worker hasn't responded in 90 seconds, fail gracefully
    const workerTimeout = setTimeout(async () => {
      worker.terminate();
      try {
        analysis.result = "Analysis timed out";
        analysis.status = "failed";
        await analysis.save();
      } catch (_) {}
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          message: "Analysis timed out. Please try again with a clearer image.",
        });
      }
    }, 90000);

    worker.on("message", async (message) => {
      clearTimeout(workerTimeout);
      try {
        if (message.success) {
          // Persist full result to DB
          analysis.imageUrl = message.imageUrl;
          analysis.result = message.result;
          analysis.diagnosisLabel = message.diagnosisLabel;
          analysis.confidenceScore = message.confidenceScore;
          analysis.recommendation = message.recommendation;
          analysis.severity = message.severity;
          analysis.improvement = message.improvement;
          analysis.status = "completed";
          await analysis.save();

          // Emit real-time Socket.io event to Doctor and Patient rooms
          try {
            const { getIO } = require("../services/socketHandler");
            const io = getIO();
            if (io) {
              const socketPayload = {
                id: analysis.id.toString(),
                patientId: analysis.patientId.toString(),
                doctorId: analysis.doctorId.toString(),
                imageUrl: analysis.imageUrl,
                diagnosisLabel: analysis.diagnosisLabel,
                severity: analysis.severity,
                improvement: analysis.improvement,
                stage: analysis.stage,
                status: "completed",
                createdAt: analysis.createdAt,
              };
              io.to(String(analysis.doctorId)).emit("analysis_completed", socketPayload);
              io.to(String(analysis.patientId)).emit("analysis_completed", socketPayload);
            }
          } catch (socketErr) {
            console.error("[SOCKET EMIT ERROR]", socketErr.message);
          }

          // Return the complete response that Flutter AiAnalysisResultScreen expects
          if (!res.headersSent) {
            res.status(200).json({
              success: true,
              // Patient identity
              patientId: patient.id.toString(),
              patientName: patient.name,
              // AI Results (structured)
              diagnosis: analysis.diagnosisLabel,
              confidence: analysis.confidenceScore,
              severity: analysis.severity,
              improvement: analysis.improvement,
              recommendation: analysis.recommendation,
              // Scan context
              isFirstScan,
              stage: analysis.stage,
              date: analysis.createdAt,
              imageUrl: analysis.imageUrl,
              // Previous scan data (null for first scan)
              previousScan: isFirstScan
                ? null
                : {
                    imageUrl: previousImageUrl,
                    severity: previousSeverity,
                  },
              // Raw analysis record
              analysis: {
                id: analysis.id.toString(),
                result: analysis.result,
                status: analysis.status,
              },
            });
          }
        } else {
          // Worker reported a failure
          analysis.result = `Analysis failed: ${message.error}`;
          analysis.status = "failed";
          await analysis.save();

          try {
            const { getIO } = require("../services/socketHandler");
            const io = getIO();
            if (io) {
              io.to(String(analysis.doctorId)).emit("analysis_failed", {
                id: analysis.id.toString(),
                patientId: analysis.patientId.toString(),
                error: message.error,
              });
            }
          } catch (_) {}

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "AI analysis failed",
              error: message.error,
            });
          }
        }
      } catch (err) {
        console.error("[ANALYSIS CONTROLLER WORKER MESSAGE ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Server error while processing analysis result",
          });
        }
      }
    });

    worker.on("error", async (err) => {
      clearTimeout(workerTimeout);
      console.error("[ANALYSIS WORKER THREAD ERROR]", err);
      try {
        analysis.result = `Worker thread crashed: ${err.message}`;
        analysis.status = "failed";
        await analysis.save();
      } catch (_) {}
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Analysis worker crashed",
          error: err.message,
        });
      }
    });
  } catch (error) {
    console.error("[CREATE ANALYSIS CONTROLLER ERROR]", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

/**
 * GET /api/patient/:patientId/analyses
 * Returns all analyses for a patient, ordered newest first.
 */
exports.getPatientAnalyses = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patient = await getOrCreatePatient(patientId, req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const { rows: analyses, count } = await Analysis.findAndCountAll({
      where: { patientId: patient.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: analyses,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("[GET PATIENT ANALYSES ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
