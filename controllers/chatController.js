const { Op } = require("sequelize");
const Message = require("../models/Message");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// Helper to format messages to return exact required fields
const formatMessage = (msg) => {
  const plain = typeof msg.get === "function" ? msg.get({ plain: true }) : msg;
  return {
    _id: plain.id ? plain.id.toString() : "",
    senderId: plain.senderId ? plain.senderId.toString() : "",
    receiverId: plain.receiverId ? plain.receiverId.toString() : "",
    content: plain.content !== undefined && plain.content !== null ? plain.content : "",
    type: plain.type || "text",
    mediaUrl: plain.mediaUrl || null,
    durationMs: plain.durationMs !== undefined && plain.durationMs !== null ? Number(plain.durationMs) : null,
    isRead: plain.isRead !== undefined && plain.isRead !== null ? !!plain.isRead : false,
    createdAt: plain.createdAt ? (plain.createdAt.toISOString ? plain.createdAt.toISOString() : plain.createdAt) : new Date().toISOString()
  };
};

// Helper to upload buffer to Cloudinary with auto type detection
const uploadToCloudinary = (buffer, folder) => {
  // If credentials are placeholders, return a mock URL for local testing
  if (
    !process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY.includes("xxxx") ||
    !process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME.includes("xxxx")
  ) {
    console.log("⚠️ Cloudinary placeholder keys detected. Returning mock upload URL for testing.");
    return Promise.resolve({
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1234567890/sample.png",
    });
  }

  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: "auto",
    };
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

// @desc    Get all unique conversations with partner info, last message, and unread counts
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all distinct messages sent or received by this user
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
        // Return a clean representation of the last message
        let lastMsgText = msg.content || "";
        if (!lastMsgText && msg.type && msg.type !== "text") {
          lastMsgText = `[${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}]`;
        }
        
        convMap[partnerId] = {
          _id: partnerId.toString(),
          receiverId: partnerId.toString(),
          lastMessage: lastMsgText,
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
        const partner = partnerMap[Number(conv._id)];
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

    const formattedMessages = messages.map(formatMessage);

    res.json(formattedMessages);
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/chat/send
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    let { receiverId, content, type, durationMs } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    let mediaUrl = null;
    let finalType = type || "text";
    let finalDuration = durationMs ? parseInt(durationMs, 10) : null;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "dermalyze/chat");
        mediaUrl = uploadResult.secure_url;

        // Determine final type if not provided or text
        if (!["image", "audio", "file"].includes(finalType)) {
          if (req.file.mimetype.startsWith("image/")) {
            finalType = "image";
          } else if (req.file.mimetype.startsWith("audio/")) {
            finalType = "audio";
          } else {
            finalType = "file";
          }
        }
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({ message: `Media upload failed: ${uploadError.message}` });
      }
    } else {
      // Text message validation
      if (!content) {
        return res.status(400).json({ message: "Content is required for text messages" });
      }
      finalType = "text";
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content: content || "",
      type: finalType,
      mediaUrl,
      durationMs: isNaN(finalDuration) ? null : finalDuration,
    });

    const formatted = formatMessage(message);

    res.status(201).json(formatted);
  } catch (error) {
    next(error);
  }
};

// Export the formatMessage helper for socketHandler or other controllers to use
exports.formatMessage = formatMessage;
