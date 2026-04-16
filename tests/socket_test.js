const { io } = require("socket.io-client");

const socket = io("https://dermalyze-backend-production.up.railway.app", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTEyNWY5OGMzNTZiMmRlNmUwZTg0OSIsInJvbGUiOiJkb2N0b3IiLCJpYXQiOjE3NzYzNjMwMTIsImV4cCI6MTc3ODk1NTAxMn0.qagnsloGm0XAi_DiYH6F0TnhdkvIQrLDW0tcpxHVvWY"
  }
});

socket.on("connect", () => {
  console.log("SUCCESS: Connected to Socket.io");
  socket.disconnect();
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("FAILURE: Connection error", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("FAILURE: Timeout connecting to Socket.io");
  process.exit(1);
}, 10000);
