require('dotenv').config();
const { sequelize } = require('./config/db');
const Message = require('./models/Message');
const User = require('./models/User');

async function test() {
  await sequelize.authenticate();
  console.log("Database connected.");
  
  // Create a mock users if not exist
  const userA = await User.findOrCreate({ where: { email: "testA@test.com" }, defaults: { name: "A", password: "123" }});
  const userB = await User.findOrCreate({ where: { email: "testB@test.com" }, defaults: { name: "B", password: "123" }});
  
  const uidA = userA[0].id;
  const uidB = userB[0].id;

  // fetch messages limit 2 offset 0
  const req = { params: { receiverId: uidB }, user: { id: uidA }, query: { limit: 2, offset: 0 }};
  const res = { json: (data) => console.log("Limit 2 Offset 0:", data.length, "messages returned") };
  const next = (err) => console.error("Error:", err);

  const { getMessages } = require('./controllers/chatController');
  
  await getMessages(req, res, next);
  
  process.exit(0);
}

test();
