const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");
const chatController = require("../controllers/chatController");

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
 *     summary: Get message history with a user and mark as read
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: receiverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of message objects
 */
router.get("/messages/:receiverId", validateObjectId("receiverId"), chatController.getMessages);

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
router.post("/send", chatController.sendMessage);

module.exports = router;
