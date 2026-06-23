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
    socket.broadcast.emit("user_online", { userId: String(userId) });
    
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

        // Calculate unreadCount for the receiver to include in the real-time event
        const unreadCount = await Message.count({
          where: { receiverId, senderId: userId, isRead: false }
        });
        formatted.unreadCount = Number(unreadCount) || 0;

        // Emit to receiver's personal room using socket.to to avoid echo
        socket.to(String(receiverId)).emit("receive_message", formatted);
        
        // Also emit back to sender for confirmation
        socket.emit("message_sent", formatted);

        // Trigger background FCM push notification
        const receiver = await User.findByPk(receiverId);
        if (receiver && !receiver.isOnline && receiver.fcmToken && receiver.pushNotifications !== false) {
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
      const { receiverId } = data;
      socket.to(String(receiverId)).emit("user_typing", { userId: String(userId), isTyping: true });
    });

    socket.on("stop_typing", (data) => {
      const { receiverId } = data;
      socket.to(String(receiverId)).emit("user_typing", { userId: String(userId), isTyping: false });
    });

    // 📩 Real-Time Read Receipts (Blue Ticks)
    socket.on("mark_as_read", async (data) => {
      try {
        const { senderId } = data; // The user who sent the message to this socket user
        if (!senderId) return;

        // Update DB
        await Message.update(
          { isRead: true, status: "read" },
          { where: { senderId, receiverId: userId, status: { [require("sequelize").Op.ne]: "read" } } }
        );

        // Notify the original sender that their messages were read
        io.to(String(senderId)).emit("messages_read", { 
          receiverId: String(userId),
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error in mark_as_read:", err.message);
      }
    });

    // 📩 Delivery Receipts (Double Grey Ticks)
    socket.on("message_received", async (data) => {
      try {
        const { senderId, messageId } = data;
        if (!senderId) return;

        // Update DB
        const whereClause = { senderId, receiverId: userId, status: "sent" };
        if (messageId) whereClause.id = messageId;
        
        await Message.update(
          { status: "delivered" },
          { where: whereClause }
        );

        io.to(String(senderId)).emit("message_delivered", {
          receiverId: String(userId),
          messageId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error in message_received:", err.message);
      }
    });

    // 🎭 Real-Time Reactions
    socket.on("react_to_message", async (data) => {
      try {
        const { messageId, reaction } = data;
        if (!messageId) return;

        const message = await Message.findByPk(messageId);
        if (!message) return;

        await message.update({ reaction });

        // Emit to both sender and receiver so their UIs update instantly
        const formatted = require("../controllers/chatController").formatMessage(message);
        socket.to(String(message.receiverId)).emit("message_reacted", formatted);
        socket.emit("message_reacted", formatted);
      } catch (err) {
        console.error("Error in react_to_message:", err.message);
      }
    });

    // 🔴 Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${userId}`);
      await User.update({ isOnline: false, lastSeen: new Date() }, { where: { id: userId } });
      socket.broadcast.emit("user_offline", { userId: String(userId), lastSeen: new Date().toISOString() });
    });
  });
};

const getIO = () => ioInstance;

module.exports = socketHandler;
module.exports.getIO = getIO;
