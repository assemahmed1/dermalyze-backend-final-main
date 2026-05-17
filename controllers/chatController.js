const { Op, fn, col, literal } = require("sequelize");
const Message = require("../models/Message");
const User = require("../models/User");

// @desc    Get all unique conversations with partner info, last message, and unread counts
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all distinct partner IDs from messages
    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      order: [["createdAt", "DESC"]],
    });

    // Build conversation map keyed by partnerId
    const convMap = {};
    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convMap[partnerId]) {
        convMap[partnerId] = {
          _id: partnerId,
          receiverId: partnerId,
          lastMessage: msg.content,
          time: msg.createdAt,
          unreadCount: 0,
        };
      }
      // Count unread messages sent TO the current user from this partner
      if (!msg.isRead && msg.receiverId === userId && msg.senderId === partnerId) {
        convMap[partnerId].unreadCount += 1;
      }
    }

    // Fetch partner details
    const partnerIds = Object.keys(convMap).map(Number);
    if (partnerIds.length === 0) return res.json([]);

    const partners = await User.findAll({
      where: { id: { [Op.in]: partnerIds } },
      attributes: ["id", "name", "role", "isOnline"],
    });

    const partnerMap = {};
    for (const p of partners) {
      partnerMap[p.id] = p;
    }

    const conversations = Object.values(convMap)
      .map((conv) => {
        const partner = partnerMap[conv._id];
        if (!partner) return null;
        return {
          ...conv,
          name: partner.name,
          role: partner.role.charAt(0).toUpperCase() + partner.role.slice(1),
          isOnline: partner.isOnline,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

// @desc    Get message history with a specific user + Mark as read
// @route   GET /api/chat/messages/:receiverId
exports.getMessages = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const myId = req.user.id;

    // 1. Mark all unread messages from this partner to me as read
    await Message.update(
      { isRead: true },
      { where: { senderId: receiverId, receiverId: myId, isRead: false } }
    );

    // 2. Fetch history
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: myId, receiverId },
          { senderId: receiverId, receiverId: myId },
        ],
      },
      order: [["createdAt", "ASC"]],
    });

    const formattedMessages = messages.map((msg) => {
      const plainMsg = msg.get({ plain: true });
      return {
        ...plainMsg,
        _id: plainMsg.id, // For MongoDB backward compatibility
      };
    });

    res.json(formattedMessages);
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/chat/send
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver ID and content are required" });
    }

    const message = await Message.create({ senderId, receiverId, content });
    const plainMsg = message.get({ plain: true });

    res.status(201).json({
      ...plainMsg,
      _id: plainMsg.id, // For MongoDB backward compatibility
    });
  } catch (error) {
    next(error);
  }
};
