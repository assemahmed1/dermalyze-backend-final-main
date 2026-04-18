const Notification = require("../models/Notification");

/**
 * Utility to create a notification for a doctor
 * @param {string} doctorId - ID of the doctor recipient
 * @param {object} data - Notification details { title, body, type, patientId }
 * @returns {Promise<object>} - The created notification
 */
exports.createNotification = async (doctorId, { title, body, type, patientId }) => {
  try {
    const notification = await Notification.create({
      doctorId,
      title,
      body,
      type,
      patientId,
    });
    return notification;
  } catch (error) {
    console.error(`[NOTIFICATION UTILS ERROR] ${error.message}`);
    // We throw the error but log it; caller can decide if this failure is critical
    throw error;
  }
};
