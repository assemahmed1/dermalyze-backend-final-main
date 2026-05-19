// cacheMiddleware.js — Upstash REST & In-Memory Fallback Cache Middleware
const { Redis } = require("@upstash/redis");

let redisClient = null;
let isRedisConfigured = false;

// In-memory fallback cache Map with bounded size (LRU eviction)
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 500;

const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (restUrl && restToken) {
  try {
    redisClient = new Redis({
      url: restUrl,
      token: restToken,
    });
    isRedisConfigured = true;
    console.log("✅ Upstash Redis client initialized.");
  } catch (err) {
    console.error("❌ Failed to initialize Upstash Redis:", err.message);
  }
} else {
  console.log("⚠️ Upstash Redis credentials not configured. Using high-performance in-memory cache.");
}

const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    // Construct request specific cache key
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      if (isRedisConfigured && redisClient) {
        try {
          const cachedValue = await redisClient.get(cacheKey);
          if (cachedValue) {
            console.log(`⚡ Cache HIT (Upstash Redis): ${cacheKey}`);
            const data = typeof cachedValue === "string" ? JSON.parse(cachedValue) : cachedValue;
            return res.json(data);
          }
        } catch (redisError) {
          console.warn("⚠️ Upstash Redis GET failed, falling back to in-memory:", redisError.message);
        }
      }

      // Fallback: In-memory cache
      const cachedItem = memoryCache.get(cacheKey);
      if (cachedItem && cachedItem.expiry > Date.now()) {
        console.log(`⚡ Cache HIT (In-Memory Fallback): ${cacheKey}`);
        return res.json(cachedItem.value);
      } else if (cachedItem) {
        memoryCache.delete(cacheKey);
      }

      // Intercept and wrap response payload
      const originalJson = res.json;
      res.json = function (data) {
        res.json = originalJson;

        if (res.statusCode === 200) {
          if (isRedisConfigured && redisClient) {
            redisClient.set(cacheKey, JSON.stringify(data), {
              ex: ttlSeconds,
            }).catch((err) => {
              console.warn("⚠️ Upstash Redis SET failed, saving to in-memory fallback:", err.message);
              memoryCache.set(cacheKey, {
                value: data,
                expiry: Date.now() + ttlSeconds * 1000,
              });
            });
          } else {
            // Evict oldest entry if cache is at max capacity
            if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
              const firstKey = memoryCache.keys().next().value;
              memoryCache.delete(firstKey);
            }
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
