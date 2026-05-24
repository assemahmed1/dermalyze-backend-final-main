require('dotenv').config();
const { Redis } = require("@upstash/redis");

async function run() {
  const redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    const keys = await redisClient.keys("cache:*");
    console.log("Keys found:", keys);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log("Cache cleared!");
    } else {
      console.log("No cache keys found.");
    }
  } catch(e) {
    console.error(e);
  }
}
run();
