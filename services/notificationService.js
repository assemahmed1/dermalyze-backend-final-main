const admin = require("firebase-admin");

// Initialize Firebase Admin
// Ideally, the Service Account JSON should be set via environment variable: FIREBASE_SERVICE_ACCOUNT
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully ✅");
  } else {
    console.warn("⚠️ Firebase Service Account not found. Push Notifications will be disabled. Set FIREBASE_SERVICE_ACCOUNT env var.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error.message);
}

/**
 * Send a push notification to a specific user
 * @param {string} fcmToken - Device token
 * @param {object} payload - Notification object { title, body, data }
 */
const sendPushNotification = async (fcmToken, payload) => {
  if (!admin.apps.length || !fcmToken) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error.message);
  }
};

module.exports = { sendPushNotification };
