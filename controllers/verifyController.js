const { compareFaces, checkDoctorOnId } = require("../services/faceService");

// ✅ Verify doctor identity
// Accepts: ID front + ID back + selfie
exports.verifyIdentity = async (req, res, next) => {
  try {
    const { idFront, idBack, selfie } = req.files;

    if (!idFront || !idBack || !selfie) {
      return res.status(400).json({
        message: "idFront, idBack, and selfie are all required",
      });
    }

    // Run face match and OCR check simultaneously
    const [faceResult, doctorResult] = await Promise.all([
      compareFaces(idFront[0].buffer, selfie[0].buffer),
      checkDoctorOnId(idBack[0].buffer),
    ]);

    // If face does not match
    if (!faceResult.match) {
      return res.status(400).json({
        verified: false,
        faceMatch: false,
        isDoctor: doctorResult.isDoctor,
        similarity: faceResult.similarity,
        message: faceResult.message,
      });
    }

    // If doctor profession not found on ID back
    if (!doctorResult.isDoctor) {
      return res.status(400).json({
        verified: false,
        faceMatch: true,
        isDoctor: false,
        similarity: faceResult.similarity,
        message: "Could not verify doctor profession on ID back",
      });
    }

    // All checks passed ✅
    res.json({
      verified: true,
      faceMatch: true,
      isDoctor: true,
      similarity: faceResult.similarity,
      message: "Identity and profession verified successfully",
    });

  } catch (error) {
    next(error);
  }
};
