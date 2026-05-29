const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const { sendPushNotification } = require("./notificationService");

let ioInstance = null;

const socketHandler = (io) => {
  ioInstance = io;

  // Authentication Middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`🟢 User connected: ${socket.user.name} (${userId})`);

    // 1. Update online status
    await User.update({ isOnline: true }, { where: { id: userId } });
    
    // 2. Join a personal room for private messaging
    socket.join(String(userId));

    // 📩 Handle sending message
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, type, mediaUrl, durationMs } = data;
        const validTypes = ["text", "image", "audio", "file"];
        const finalType = validTypes.includes(type) ? type : "text";

        if (!receiverId) {
          return socket.emit("error", { message: "receiverId is required" });
        }

        if (finalType === "text" && !content) {
          return socket.emit("error", { message: "content is required for text messages" });
        }

        // Save message to Database
        const message = await Message.create({
          senderId: userId,
          receiverId,
          content: content || "",
          type: finalType,
          mediaUrl: mediaUrl || null,
          durationMs: durationMs ? parseInt(durationMs, 10) : null,
        });

        const { formatMessage } = require("../controllers/chatController");
        const formatted = formatMessage(message);

        // Emit to receiver's personal room
        io.to(String(receiverId)).emit("receive_message", formatted);
        
        // Also emit back to sender for confirmation
        socket.emit("message_sent", formatted);

        // Trigger background FCM push notification
        const receiver = await User.findByPk(receiverId);
        if (receiver && receiver.fcmToken && receiver.pushNotifications !== false) {
          const bodyText = finalType === "text"
            ? (content || "")
            : `[${finalType.charAt(0).toUpperCase() + finalType.slice(1)}]`;

          sendPushNotification(receiver.fcmToken, {
            title: socket.user.name,
            body: bodyText,
            data: {
              type: "chat",
              senderId: userId.toString(),
            }
          }).catch((err) => {
            console.error("[FCM NOTIFICATION ERROR]", err.message);
          });
        }

      } catch (error) {
        console.error("Socket error (send_message):", error.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ⌨️ Handle typing status
    socket.on("typing", (data) => {
      const { receiverId, isTyping } = data;
      io.to(String(receiverId)).emit("user_typing", {
        userId: userId,
        isTyping,
      });
    });

    // 🔴 Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${userId}`);
      await User.update({ isOnline: false }, { where: { id: userId } });
    });
  });
};

const getIO = () => ioInstance;

module.exports = socketHandler;
module.exports.getIO = getIO;
