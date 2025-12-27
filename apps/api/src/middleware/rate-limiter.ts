import { FastifyRequest, FastifyReply } from "fastify";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../lib/redis.js";

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "ratelimit",
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
  blockDuration: 60, // block for 60 seconds if exceeded
});

export async function rateLimiterMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const siteId = request.headers["x-site-id"] as string;
  const key = siteId || request.ip;

  try {
    const result = await rateLimiter.consume(key);

    // Add rate limit headers
    reply.header("X-RateLimit-Limit", 100);
    reply.header("X-RateLimit-Remaining", result.remainingPoints);
    reply.header(
      "X-RateLimit-Reset",
      Math.ceil(result.msBeforeNext / 1000)
    );
  } catch (error: any) {
    if (error.remainingPoints !== undefined) {
      // Rate limit exceeded
      reply.header("X-RateLimit-Limit", 100);
      reply.header("X-RateLimit-Remaining", 0);
      reply.header("X-RateLimit-Reset", Math.ceil(error.msBeforeNext / 1000));
      reply.header("Retry-After", Math.ceil(error.msBeforeNext / 1000));

      return reply.status(429).send({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      });
    }
    throw error;
  }
}

export { rateLimiterMiddleware as rateLimiter };
