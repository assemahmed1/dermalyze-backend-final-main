const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// @desc    Get all conversations for the logged-in user
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name email role")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

// @desc    Get message history for a conversation
// @route   GET /api/chat/messages/:conversationId
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // IDOR Fix: verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(404).json({ message: "Conversation not found or access denied" });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages for performance

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// @desc    Start/Get a conversation (Check if exists, or create)
// @route   POST /api/chat/conversations
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;
    const myId = req.user.id;

    if (!participantId) {
      return res.status(400).json({ message: "Participant ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: "Invalid Participant ID format" });
    }

    // Check if conversation already exists between these two
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, participantId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, participantId],
      });
    }

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};
