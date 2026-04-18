const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

// @desc    Get all unique conversations with partner info, last message, and unread counts
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      // 1. Find all messages related to this user
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      // 2. Sort by date descending so the first one in each group is the latest
      { $sort: { createdAt: -1 } },
      // 3. Project partnerId (the ID of the OTHER user in the chat)
      {
        $project: {
          partnerId: {
            $cond: { if: { $eq: ["$senderId", userId] }, then: "$receiverId", else: "$senderId" },
          },
          content: 1,
          isRead: 1,
          senderId: 1,
          receiverId: 1,
          createdAt: 1,
        },
      },
      // 4. Group by partner to find last message summary
      {
        $group: {
          _id: "$partnerId",
          lastMessage: { $first: "$content" },
          time: { $first: "$createdAt" },
          // Count unread messages sent TO the current user from this partner
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$isRead", false] }, { $eq: ["$receiverId", userId] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      // 5. Lookup partner details
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partnerInfo",
        },
      },
      { $unwind: "$partnerInfo" },
      // 6. Project final shape
      {
        $project: {
          _id: 1,
          receiverId: "$_id",
          name: "$partnerInfo.name",
          role: { $concat: [{ $toUpper: { $substr: ["$partnerInfo.role", 0, 1] } }, { $substr: ["$partnerInfo.role", 1, -1] }] },
          lastMessage: 1,
          time: 1,
          isOnline: "$partnerInfo.isOnline",
          unreadCount: 1,
        },
      },
      // 7. Sort conversations by time descending
      { $sort: { time: -1 } },
    ]);

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

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // 1. Mark all unread messages from this partner to me as read
    await Message.updateMany(
      { senderId: receiverId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    // 2. Fetch history
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: receiverId },
        { senderId: receiverId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
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

    const message = await Message.create({
      senderId,
      receiverId,
      content,
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};
