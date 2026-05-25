const { Redis } = require("@upstash/redis");

// Initialize Redis client from environment variables
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("✅ Redis cache connected (Upstash)");
  } else {
    console.warn("⚠️  Redis env vars not set — caching disabled");
  }
} catch (err) {
  console.error("❌ Redis connection failed:", err.message);
}

/**
 * Creates a caching middleware for GET endpoints.
 *
 * @param {string} prefix   - Cache key prefix (e.g. "medicines")
 * @param {number} ttlSecs  - Time-to-live in seconds (default 3600 = 1 hour)
 * @returns Express middleware
 *
 * Usage:
 *   router.get("/all", cache("medicines_all", 3600), controller.getAll);
 */
function cache(prefix, ttlSecs = 3600) {
  return async (req, res, next) => {
    // Skip caching if Redis is unavailable
    if (!redis) return next();

    // Build a unique cache key from prefix + query string
    const queryStr = JSON.stringify(req.query || {});
    const cacheKey = `dermalyze:${prefix}:${Buffer.from(queryStr).toString("base64")}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }
    } catch (err) {
      // Redis read failure — fall through to DB (never block the request)
      console.error("[CACHE READ ERROR]", err.message);
    }

    // Intercept res.json to cache the response before sending
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      res.setHeader("X-Cache", "MISS");
      try {
        await redis.set(cacheKey, data, { ex: ttlSecs });
      } catch (err) {
        console.error("[CACHE WRITE ERROR]", err.message);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate all cache keys matching a given prefix.
 * Call this when data changes (e.g. new medicine added).
 *
 * @param {string} prefix  - e.g. "medicines_all"
 */
async function invalidateCache(prefix) {
  if (!redis) return;
  try {
    const pattern = `dermalyze:${prefix}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cache invalidated: ${keys.length} keys (prefix: ${prefix})`);
    }
  } catch (err) {
    console.error("[CACHE INVALIDATE ERROR]", err.message);
  }
}

module.exports = { cache, invalidateCache };
