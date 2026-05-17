const redis = require("redis");

let redisClient = null;
let isRedisConnected = false;

// In-memory fallback cache Map
const memoryCache = new Map();

const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || null;

if (redisUrl) {
  redisClient = redis.createClient({ url: redisUrl });
} else if (process.env.REDISHOST && process.env.REDISPORT) {
  redisClient = redis.createClient({
    socket: {
      host: process.env.REDISHOST,
      port: parseInt(process.env.REDISPORT, 10),
    },
    password: process.env.REDISPASSWORD || undefined,
  });
} else {
  redisClient = redis.createClient();
}

redisClient.on("connect", () => {
  console.log("🚀 Connecting to Redis...");
});

redisClient.on("ready", () => {
  isRedisConnected = true;
  console.log("✅ Redis client connected and ready.");
});

redisClient.on("error", (err) => {
  isRedisConnected = false;
  // Silent warning to avoid cluttering local console if Redis is offline
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️ Redis Client Error:", err.message);
  }
});

// Non-blocking connect
redisClient.connect().catch(() => {
  console.log("⚠️ Redis offline. Using high-performance in-memory cache.");
  isRedisConnected = false;
});

const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    // Construct request specific cache key
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      if (isRedisConnected && redisClient) {
        const cachedValue = await redisClient.get(cacheKey);
        if (cachedValue) {
          console.log(`⚡ Cache HIT (Redis): ${cacheKey}`);
          return res.json(JSON.parse(cachedValue));
        }
      } else {
        const cachedItem = memoryCache.get(cacheKey);
        if (cachedItem && cachedItem.expiry > Date.now()) {
          console.log(`⚡ Cache HIT (In-Memory): ${cacheKey}`);
          return res.json(cachedItem.value);
        } else if (cachedItem) {
          memoryCache.delete(cacheKey);
        }
      }

      // Intercept and wrap response payload
      const originalJson = res.json;
      res.json = function (data) {
        res.json = originalJson;

        if (res.statusCode === 200) {
          if (isRedisConnected && redisClient) {
            redisClient.set(cacheKey, JSON.stringify(data), {
              EX: ttlSeconds,
            }).catch((err) => console.error("Redis set error:", err));
          } else {
            memoryCache.set(cacheKey, {
              value: data,
              expiry: Date.now() + ttlSeconds * 1000,
            });
          }
        }

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn("Cache middleware bypass:", error.message);
      next();
    }
  };
};

module.exports = cacheMiddleware;
