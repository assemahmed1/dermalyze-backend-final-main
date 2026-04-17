const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const socketHandler = (io) => {
  // Authentication Middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    // Join a specific conversation room
    socket.on("join_chat", async (conversationId) => {
      try {
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          return socket.emit("error", { message: "Invalid conversion ID format" });
        }

        const conversation = await Conversation.findById(conversationId);
        
        // IDOR Fix: verify user is a participant
        const isParticipant = conversation.participants.some(p => p.toString() === socket.user.id);
        if (!conversation || !isParticipant) {
          return socket.emit("error", { message: "Unauthorized: You are not a participant in this conversation" });
        }

        socket.join(conversationId);
        console.log(`User ${socket.user.id} joined room: ${conversationId}`);
      } catch (err) {
        socket.emit("error", { message: "Invalid conversation ID" });
      }
    });

    // Handle sending message
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, text } = data;

        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          return socket.emit("error", { message: "Invalid conversion ID format" });
        }

        // IDOR Fix: verify user is a participant before allowing message
        const conversation = await Conversation.findById(conversationId);
        const isParticipant = conversation?.participants.some(p => p.toString() === socket.user.id);
        if (!conversation || !isParticipant) {
          return socket.emit("error", { message: "Unauthorized: You are not a participant in this conversation" });
        }

        const message = await Message.create({
          conversationId,
          sender: socket.user.id,
          text,
        });

        // Update last message in conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });

        // Broadcast to everyone in the room except sender (or use io.to for all)
        io.to(conversationId).emit("receive_message", message);
      } catch (error) {
        console.error("Socket error (send_message):", error.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing status
    socket.on("typing", (data) => {
      const { conversationId, isTyping } = data;
      socket.to(conversationId).emit("user_typing", {
        userId: socket.user.id,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};

module.exports = socketHandler;
