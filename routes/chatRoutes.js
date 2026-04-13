const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const {
  getConversations,
  getMessages,
  getOrCreateConversation,
} = require("../controllers/chatController");

router.use(protect); // All chat routes require authentication

router.get("/conversations", getConversations);
router.post("/conversations", getOrCreateConversation);
router.get("/messages/:conversationId", getMessages);

module.exports = router;
