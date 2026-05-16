const { Resend } = require("resend");

/**
 * Helper to send OTP email using Resend API
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit code
 */
exports.sendOTPEmail = async (email, otp) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Dermalyze <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Your Password Reset OTP - Dermalyze",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">Forgot Your Password?</h2>
          <p style="font-size: 16px; color: #34495e;">Hello,</p>
          <p style="font-size: 16px; color: #34495e;">We received a request to reset your password. Use the verification code below to proceed. This code is valid for <strong>10 minutes</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; background: #f4f7f6; padding: 10px 20px; border-radius: 5px; border: 1px dashed #3498db;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #7f8c8d;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #bdc3c7;">&copy; ${new Date().getFullYear()} Dermalyze. All rights reserved.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error(`[RESEND ERROR] ${err.message}`);
    throw err;
  }
};

/**
 * Notify admin that a new doctor has registered and needs ID verification
 * @param {string} adminEmail - Admin email address
 * @param {string} doctorName - Name of the registered doctor
 * @param {string} idCardFrontUrl - Cloudinary URL of the ID card front
 * @param {string} idCardBackUrl - Cloudinary URL of the ID card back
 * @param {string} selfieUrl - Cloudinary URL of the doctor's selfie
 */
exports.sendAdminNewDoctorAlert = async (adminEmail, doctorName, idCardFrontUrl, idCardBackUrl, selfieUrl) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Dermalyze <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: "New Doctor Registration — ID Verification Required",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">🩺 New Doctor Registration</h2>
          <p style="font-size: 16px; color: #34495e;">A new doctor has registered and is awaiting ID card verification:</p>
          <div style="background: #f4f7f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; margin: 5px 0;"><strong>Name:</strong> ${doctorName}</p>
          </div>
          <p style="font-size: 16px; color: #34495e;">Please review the submitted documents:</p>
          <div style="margin: 20px 0;">
            <p style="font-size: 14px; font-weight: bold; color: #2c3e50;">📄 ID Card - Front</p>
            <div style="text-align: center; margin-bottom: 15px;">
              <img src="${idCardFrontUrl}" alt="ID Card Front" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
            </div>
            <p style="font-size: 14px; font-weight: bold; color: #2c3e50;">📄 ID Card - Back</p>
            <div style="text-align: center; margin-bottom: 15px;">
              <img src="${idCardBackUrl}" alt="ID Card Back" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
            </div>
            <p style="font-size: 14px; font-weight: bold; color: #2c3e50;">🤳 Selfie</p>
            <div style="text-align: center; margin-bottom: 15px;">
              <img src="${selfieUrl}" alt="Doctor Selfie" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" />
            </div>
          </div>
          <p style="font-size: 14px; color: #7f8c8d;">Log in to the admin panel to approve or reject this doctor.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #bdc3c7;">&copy; ${new Date().getFullYear()} Dermalyze. All rights reserved.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error(`[RESEND ERROR - Admin Alert] ${err.message}`);
    throw err;
  }
};

/**
 * Notify doctor of their verification result (approved or rejected)
 * @param {string} doctorEmail - Doctor's email address
 * @param {string} status - "verified" or "rejected"
 * @param {string} [note] - Optional rejection reason
 */
exports.sendDoctorVerificationResult = async (doctorEmail, status, note) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Dermalyze <onboarding@resend.dev>";
    const isApproved = status === "verified";

    const subject = isApproved
      ? "Your Dermalyze Account Has Been Approved ✅"
      : "Your Dermalyze Account Verification Update";

    const bodyContent = isApproved
      ? `<p style="font-size: 16px; color: #27ae60; font-weight: bold;">Your account has been approved. You can now log in.</p>`
      : `<p style="font-size: 16px; color: #e74c3c; font-weight: bold;">Your account was rejected.</p>
         <p style="font-size: 16px; color: #34495e;"><strong>Reason:</strong> ${note || "No reason provided."}</p>`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [doctorEmail],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">Account Verification Result</h2>
          ${bodyContent}
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #bdc3c7;">&copy; ${new Date().getFullYear()} Dermalyze. All rights reserved.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error(`[RESEND ERROR - Verification Result] ${err.message}`);
    throw err;
  }
};
