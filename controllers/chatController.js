const { Op, fn, col, literal } = require("sequelize");
const Message = require("../models/Message");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinaryUtils");
const cloudinary = require("../config/cloudinary");
const { sendPushNotification } = require("../services/notificationService");

// Helper to format messages to return exact required fields
const formatMessage = (msg) => {
  const plain = typeof msg.get === "function" ? msg.get({ plain: true }) : msg;

  let senderId = plain.senderId;
  let senderObj = undefined;
  if (senderId && typeof senderId === 'object') {
    senderObj = senderId;
    senderId = senderId.id || senderId._id || "";
  }

  let receiverId = plain.receiverId;
  let receiverObj = undefined;
  if (receiverId && typeof receiverId === 'object') {
    receiverObj = receiverId;
    receiverId = receiverId.id || receiverId._id || "";
  }

  const formatted = {
    _id: plain.id ? plain.id.toString() : "",
    senderId: senderId ? senderId.toString() : "",
    receiverId: receiverId ? receiverId.toString() : "",
    content: plain.content !== undefined && plain.content !== null ? plain.content : "",
    type: plain.type || "text",
    mediaUrl: plain.mediaUrl || null,
    durationMs: plain.durationMs !== undefined && plain.durationMs !== null ? Number(plain.durationMs) : null,
    isRead: plain.isRead !== undefined && plain.isRead !== null ? !!plain.isRead : false,
    status: plain.status || "sent",
    reaction: plain.reaction || null,
    unreadCount: plain.unreadCount !== undefined ? Number(plain.unreadCount) : 0,
    createdAt: plain.createdAt ? (plain.createdAt.toISOString ? plain.createdAt.toISOString() : plain.createdAt) : new Date().toISOString()
  };

  if (senderObj) formatted.sender = senderObj;
  if (receiverObj) formatted.receiver = receiverObj;

  return formatted;
};


// @desc    Get all unique conversations with partner info, last message, and unread counts
// @route   GET /api/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get latest message per conversation partner using a grouped subquery (avoids full table scan)
    const latestMessages = await Message.findAll({
      attributes: [
        [literal("LEAST(senderId, receiverId)"), "userA"],
        [literal("GREATEST(senderId, receiverId)"), "userB"],
        [fn("MAX", col("id")), "maxId"],
      ],
      where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
      group: [literal("LEAST(senderId, receiverId)"), literal("GREATEST(senderId, receiverId)")],
      raw: true,
    });

    if (latestMessages.length === 0) return res.json([]);

    // Fetch the actual latest messages by their IDs
    const maxIds = latestMessages.map((row) => row.maxId);
    const messages = await Message.findAll({
      where: { id: { [Op.in]: maxIds } },
      order: [["createdAt", "DESC"]],
    });

    // Count unread messages per partner for the current user
    const unreadCounts = await Message.findAll({
      attributes: ["senderId", [fn("COUNT", col("id")), "count"]],
      where: { receiverId: userId, isRead: false },
      group: ["senderId"],
      raw: true,
    });
    const unreadMap = {};
    for (const row of unreadCounts) {
      unreadMap[row.senderId] = Number(row.count) || 0;
    }

    // Build conversation map
    const convMap = {};
    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      let lastMsgText = msg.content || "";
      if (!lastMsgText && msg.type && msg.type !== "text") {
        lastMsgText = `[${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}]`;
      }
      convMap[partnerId] = {
        _id: partnerId.toString(),
        receiverId: partnerId.toString(),
        lastMessage: lastMsgText,
        time: msg.createdAt,
        unreadCount: Number(unreadMap[partnerId]) || 0,
      };
    }

    // Fetch partner details
    const partnerIds = Object.keys(convMap).map(Number);
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

// @desc    Get message history with a specific user (supports pagination)
// @route   GET /api/chat/messages/:receiverId?limit=50&offset=0
exports.getMessages = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const myId = req.user.id;

    const limit = parseInt(req.query.limit, 10) || 50;
    let offset = parseInt(req.query.offset, 10);
    
    // Fallback to page if offset is not provided
    if (isNaN(offset)) {
      const page = parseInt(req.query.page, 10) || 1;
      offset = (page - 1) * limit;
    }

    // 1. Mark all unread messages from this partner to me as read
    await Message.update(
      { isRead: true, status: "read" },
      { where: { senderId: receiverId, receiverId: myId, status: { [Op.ne]: "read" } } }
    );

    // Emit read receipt Socket event to the partner in real-time
    const { getIO } = require("../services/socketHandler");
    const io = getIO();
    if (io) {
      io.to(String(receiverId)).emit("messages_read", { readerId: String(myId) });
    }

    // 2. Fetch history sorted latest first for correct offset pagination, and reverse for ascending chronological UI render
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: myId, receiverId },
          { senderId: receiverId, receiverId: myId },
        ],
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    const formattedMessages = messages.reverse().map(formatMessage);

    res.json(formattedMessages);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark incoming messages from partner as read
// @route   PUT /api/chat/messages/read
exports.markAsRead = async (req, res, next) => {
  try {
    const myId = req.user.id;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({ success: false, message: "senderId is required" });
    }

    await Message.update(
      { isRead: true },
      { where: { senderId, receiverId: myId, isRead: false } }
    );

    // Emit real-time read receipt to the sender
    const { getIO } = require("../services/socketHandler");
    const io = getIO();
    if (io) {
      io.to(String(senderId)).emit("messages_read", { readerId: myId });
    }

    res.json({ success: true, message: "Messages marked as read" });
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
    let validTypes = ["text", "image", "audio", "file"];
    let finalType = validTypes.includes(type) ? type : "text";
    let finalDuration = durationMs ? parseInt(durationMs, 10) : null;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "dermalyze/chat", {}, req.file.mimetype);
        mediaUrl = uploadResult.secure_url;

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
      // No file attached — require content for text messages
      if (!content) {
        return res.status(400).json({ message: "Content is required for text messages" });
      }
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

    // Calculate unreadCount for the receiver to include in the real-time event
    const unreadCount = await Message.count({
      where: { receiverId, senderId, isRead: false }
    });
    formatted.unreadCount = Number(unreadCount) || 0;

    // Emit real-time Socket.io events to receiver and sender (to prevent any sync/polling latency)
    const { getIO } = require("../services/socketHandler");
    const io = getIO();
    if (io) {
      io.to(String(receiverId)).emit("receive_message", formatted);
      io.to(String(senderId)).emit("message_sent", formatted);
      console.log(`📡 Emitted receive_message Socket event for message ID ${message.id} from HTTP POST`);
    }

    // Trigger background FCM push notification
    const [sender, receiver] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(receiverId)
    ]);

    if (receiver && !receiver.isOnline && receiver.fcmToken && receiver.pushNotifications !== false) {
      const bodyText = finalType === "text"
        ? (content || "")
        : `[${finalType.charAt(0).toUpperCase() + finalType.slice(1)}]`;

      sendPushNotification(receiver.fcmToken, {
        title: sender ? sender.name : "New Message",
        body: bodyText,
        data: {
          type: "chat",
          senderId: senderId.toString(),
        }
      }).then(async (response) => {
        if (response) {
          // FCM Hand-off successful => Receiver's phone got the notification
          // 1. Update message status to 'delivered'
          await Message.update(
            { status: "delivered" }, 
            { where: { id: message.id, status: "sent" } }
          );
          
          // 2. Emit 'message_delivered' to Sender's active socket instantly (Double Grey Ticks)
          if (io) {
            io.to(String(senderId)).emit("message_delivered", {
              messageId: String(message.id),
              receiverId: String(receiverId)
            });
          }
        }
      }).catch((err) => {
        console.error("[FCM NOTIFICATION ERROR]", err.message);
      });
    }

    res.status(201).json(formatted);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete conversation (all messages between current user and receiver)
// @route   DELETE /api/chat/conversations/:receiverId
exports.deleteConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const userId = req.user.id;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      },
    });

    if (!messages || messages.length === 0) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Delete associated media from Cloudinary
    for (const message of messages) {
      if (message.mediaUrl) {
        try {
          const urlParts = message.mediaUrl.split("/upload/");
          if (urlParts.length === 2) {
            const afterUpload = urlParts[1];
            const withoutVersion = afterUpload.replace(/^v\d+\//, "");
            const publicId = withoutVersion.replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
          }
        } catch (cloudinaryError) {
          console.error("[Cloudinary delete error in conversation]", cloudinaryError.message);
        }
      }
    }

    // Delete all messages from DB
    await Message.destroy({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      },
    });

    res.status(200).json({ success: true, message: "Conversation deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message permanently (sender only)
// @route   DELETE /api/chat/messages/:messageId
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this message" });
    }

    // Delete from Cloudinary if a media asset is attached
    if (message.mediaUrl) {
      try {
        // Extract public_id: everything after "/upload/v<version>/" and before the file extension
        // e.g. https://res.cloudinary.com/demo/image/upload/v1234567890/dermalyze/chat/abc123.mp3
        //  → public_id = "dermalyze/chat/abc123"
        const urlParts = message.mediaUrl.split("/upload/");
        if (urlParts.length === 2) {
          const afterUpload = urlParts[1]; // "v1234567890/dermalyze/chat/abc123.mp3"
          const withoutVersion = afterUpload.replace(/^v\d+\//, ""); // "dermalyze/chat/abc123.mp3"
          const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); // "dermalyze/chat/abc123"
          await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        }
      } catch (cloudinaryError) {
        // Log but do not block deletion — DB record must still be removed
        console.error("[Cloudinary delete error]", cloudinaryError.message);
      }
    }

    // Emit real-time deletion event
    const receiverId = message.receiverId;
    const messageIdStr = String(message.id);
    
    await message.destroy();

    const { getIO } = require("../services/socketHandler");
    const io = getIO();
    if (io) {
      io.to(String(receiverId)).emit("message_deleted", { messageId: messageIdStr });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user online status and last seen
// @route   GET /api/chat/last-seen/:userId
exports.getLastSeen = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, { attributes: ["id", "isOnline", "lastSeen"] });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      userId: user.id,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    next(error);
  }
};

// Export formatMessage helper
exports.formatMessage = formatMessage;
