import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
  });

  redisClient.on("connect", () => {
    console.log("Redis connected");
  });

  return redisClient;
}

export const redis = getRedis();

// Real-time visitor helpers
export async function getRealtimeVisitors(siteId: string): Promise<number> {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const count = await redis.zcount(`realtime:${siteId}`, fiveMinutesAgo, "+inf");
  return count;
}

export async function getRealtimeVisitorsList(
  siteId: string
): Promise<string[]> {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const visitors = await redis.zrangebyscore(
    `realtime:${siteId}`,
    fiveMinutesAgo,
    "+inf"
  );
  return visitors;
}

// Session management
export async function getSession(sessionId: string): Promise<any | null> {
  const data = await redis.hgetall(`session:${sessionId}`);
  if (Object.keys(data).length === 0) return null;
  return data;
}

export async function updateSession(
  sessionId: string,
  data: Record<string, string>
): Promise<void> {
  await redis.hset(`session:${sessionId}`, data);
  await redis.expire(`session:${sessionId}`, 30 * 60); // 30 minutes
}

// Rate limiting helper
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}

// Query caching
export async function getCachedQuery(queryHash: string): Promise<any | null> {
  const cached = await redis.get(`cache:query:${queryHash}`);
  if (!cached) return null;
  return JSON.parse(cached);
}

export async function setCachedQuery(
  queryHash: string,
  data: any,
  ttlSeconds = 300
): Promise<void> {
  await redis.set(`cache:query:${queryHash}`, JSON.stringify(data), "EX", ttlSeconds);
}
