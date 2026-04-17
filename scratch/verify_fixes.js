const mongoose = require("mongoose");
const validateObjectId = require("../middlewares/validateObjectId");
const chatController = require("../controllers/chatController");
const socketHandler = require("../services/socketHandler");

// Mock Response object
const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

// Mock Next function
const createMockNext = (name) => {
  return (err) => {
    if (err) {
      console.log(`[${name}] next called with error:`, err.message || err);
    } else {
      console.log(`[${name}] next called (success path)`);
    }
  };
};

// Mock Socket object
const createMockSocket = (userId) => {
  const events = {};
  const socket = {
    user: { id: userId, name: "Test User", role: "patient" },
    on: (event, cb) => {
      events[event] = cb;
    },
    emit: (event, data) => {
      console.log(`[Socket Emit] ${event}:`, data);
    },
    join: (room) => {
      console.log(`[Socket Join] Joined room: ${room}`);
    },
    to: (room) => ({
      emit: (event, data) => console.log(`[Socket To ${room}] ${event}:`, data)
    }),
    handshake: { auth: { token: "mock-token" } }
  };
  return { socket, events };
};

// Mock IO object
const createMockIO = () => {
  let middleware;
  const io = {
    use: (fn) => { middleware = fn; },
    on: (event, cb) => {
      if (event === "connection") io.onConnection = cb;
    },
    to: (room) => ({
      emit: (event, data) => console.log(`[IO To ${room}] ${event}:`, data)
    })
  };
  return io;
};

async function runTests() {
  console.log("--- Starting Verification Tests ---");

  // 1. Test validateObjectId middleware
  console.log("\n1. Testing validateObjectId middleware:");
  const middleware = validateObjectId("conversationId");
  
  const req1 = { params: { conversationId: "doctor_123" } };
  const res1 = createMockRes();
  middleware(req1, res1, createMockNext("validateObjectId - Invalid"));
  if (res1.statusCode === 400) {
    console.log("SUCCESS: Middleware returned 400 for 'doctor_123'");
  }

  const req2 = { params: { conversationId: new mongoose.Types.ObjectId().toString() } };
  const res2 = createMockRes();
  middleware(req2, res2, createMockNext("validateObjectId - Valid"));

  // 2. Test chatController.getOrCreateConversation
  console.log("\n2. Testing chatController.getOrCreateConversation:");
  const req3 = { 
    user: { id: new mongoose.Types.ObjectId().toString() },
    body: { participantId: "doctor_123" } 
  };
  const res3 = createMockRes();
  await chatController.getOrCreateConversation(req3, res3, createMockNext("getOrCreateConversation"));
  if (res3.statusCode === 400) {
    console.log("SUCCESS: Controller returned 400 for invalid participantId");
  }

  // 3. Test SocketHandler validation
  console.log("\n3. Testing SocketHandler validations:");
  const io = createMockIO();
  socketHandler(io);
  
  const { socket, events } = createMockSocket(new mongoose.Types.ObjectId().toString());
  
  // Directly simulate connection
  io.onConnection(socket);
  
  console.log("Testing join_chat with invalid ID...");
  if (events["join_chat"]) {
    await events["join_chat"]("doctor_123");
  }

  console.log("Testing send_message with invalid ID...");
  if (events["send_message"]) {
    await events["send_message"]({ conversationId: "doctor_123", text: "hello" });
  }

  console.log("\n--- Verification Tests Completed ---");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
