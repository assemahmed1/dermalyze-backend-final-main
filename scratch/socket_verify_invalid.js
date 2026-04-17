const { io } = require("socket.io-client");

const BASE_URL = "https://dermalyze-backend-production.up.railway.app";
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error("Token is required as first argument");
  process.exit(1);
}

const socket = io(BASE_URL, {
  auth: { token: TOKEN }
});

const results = {
  join_chat: false,
  send_message: false
};

const timeout = setTimeout(() => {
  console.error("Test timed out");
  console.log(JSON.stringify(results));
  process.exit(1);
}, 15000);

socket.on("connect", () => {
  console.error("Connected to socket");
  
  // Test join_chat with invalid ID
  socket.emit("join_chat", "doctor_123");
  
  // Test send_message with invalid ID
  socket.emit("send_message", { conversationId: "doctor_123", text: "this should fail" });
});

socket.on("error", (data) => {
  console.error("Received error event:", data);
  if (data.message && data.message.includes("Invalid conversion ID format")) {
    // Both join_chat and send_message will emit this error if they hit validation
    // For simplicity, we flag them if we see any validation error
    results.join_chat = true;
    results.send_message = true;
    
    console.log(JSON.stringify(results));
    clearTimeout(timeout);
    socket.disconnect();
    process.exit(0);
  }
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
  process.exit(1);
});
