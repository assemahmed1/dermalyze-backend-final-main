const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");
const chatController = require("../controllers/chatController");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.use(protect); // All chat routes require authentication

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Peer-to-peer messaging system
 */

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: List all conversations for the logged-in user
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Array of conversation objects with partner info and unread counts
 */
router.get("/conversations", chatController.getConversations);

/**
 * @swagger
 * /chat/messages/{receiverId}:
 *   get:
 *     summary: Get message history with a user (supports pagination)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Array of message objects
 */
router.get("/messages/:receiverId", validateObjectId("receiverId"), chatController.getMessages);

/**
 * @swagger
 * /chat/messages/read:
 *   put:
 *     summary: Mark incoming messages from partner as read
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderId]
 *             properties:
 *               senderId: { type: string }
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 */
router.put("/messages/read", chatController.markAsRead);

/**
 * @swagger
 * /chat/send:
 *   post:
 *     summary: Send a message to a user
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, content]
 *             properties:
 *               receiverId: { type: string }
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post("/send", upload.any(), chatController.sendMessage);

module.exports = router;
