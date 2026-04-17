const { Resend } = require("resend");

// Initialize Resend with API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Helper to send OTP email using Resend API
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit code
 */
exports.sendOTPEmail = async (email, otp) => {
  try {
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
