/**
 * WhatsApp messaging service via Fonnte API.
 * Docs: https://fonnte.com/docs
 * Auth header: Authorization: <token>  (no "Bearer" prefix)
 * Uses native fetch (Node 18+) — no extra packages required.
 */

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Send a WhatsApp message to a phone number via Fonnte.
 * @param {string} phone - Recipient phone number (e.g. "9665XXXXXXXX")
 * @param {string} message - Message text to send
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
exports.sendWhatsAppMessage = async (phone, message) => {
  try {
    const apiKey = process.env.FONNTE_API_KEY;

    if (!apiKey) {
      console.error("[WHATSAPP ERROR] FONNTE_API_KEY is not set in environment variables");
      return { success: false, error: "FONNTE_API_KEY not configured" };
    }

    let formattedPhone = String(phone || "").trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "20" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("+20")) {
      formattedPhone = formattedPhone.substring(1);
    }

    console.log(`[WHATSAPP INFO] Sending to target: ${formattedPhone}`);

    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: formattedPhone,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === false) {
      const errMsg = data.reason || data.message || `HTTP ${response.status}`;
      console.error(`[WHATSAPP ERROR] Fonnte API error: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`[WHATSAPP ERROR] Failed to send WhatsApp message: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Send a magic link activation message to a patient.
 * @param {string} phone - Patient's phone number
 * @param {string} patientName - Patient's name for personalisation
 * @param {string} token - JWT magic link token
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
exports.sendActivationLink = async (phone, patientName, token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const activationUrl = `${frontendUrl}/activate?token=${token}`;

  const message =
    `مرحباً ${patientName} 👋\n` +
    `تم إنشاء ملفك الطبي في Dermalyze.\n` +
    `اضغط على الرابط لتفعيل حسابك وتعيين كلمة المرور:\n` +
    `${activationUrl}\n` +
    `الرابط صالح لمدة 48 ساعة.`;

  return exports.sendWhatsAppMessage(phone, message);
};
