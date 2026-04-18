const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const socketHandler = (io) => {
  // Authentication Middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

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
    await User.findByIdAndUpdate(userId, { isOnline: true });
    
    // 2. Join a personal room for private messaging
    socket.join(userId);

    // 📩 Handle sending message
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content } = data;

        if (!receiverId || !content) {
          return socket.emit("error", { message: "receiverId and content are required" });
        }

        // Save message to Database
        const message = await Message.create({
          senderId: userId,
          receiverId,
          content,
        });

        // Emit to receiver's personal room
        io.to(receiverId).emit("receive_message", message);
        
        // Also emit back to sender for confirmation (optional, but good for sync)
        socket.emit("message_sent", message);

      } catch (error) {
        console.error("Socket error (send_message):", error.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ⌨️ Handle typing status
    socket.on("typing", (data) => {
      const { receiverId, isTyping } = data;
      io.to(receiverId).emit("user_typing", {
        userId: userId,
        isTyping,
      });
    });

    // 🔴 Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${userId}`);
      await User.findByIdAndUpdate(userId, { isOnline: false });
    });
  });
};

module.exports = socketHandler;
