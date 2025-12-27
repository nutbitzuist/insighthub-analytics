import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { redis } from "../lib/redis.js";
import { eventQueue } from "../queues/events.js";
import { rateLimiter } from "../middleware/rate-limiter.js";
import { validateSite } from "../middleware/validate-site.js";
import { enrichEvent } from "../services/enrichment.js";
import type { RawEvent } from "@shared/types";

// Event schema validation
const eventSchema = z.object({
  name: z.string().min(1).max(100),
  timestamp: z.number(),
  properties: z.record(z.any()).optional(),
  context: z
    .object({
      viewport_width: z.number().optional(),
      viewport_height: z.number().optional(),
      screen_width: z.number().optional(),
      screen_height: z.number().optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

const collectSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
  session: z.object({
    id: z.string(),
    is_new: z.boolean().optional(),
  }),
  visitor: z.object({
    id: z.string(),
    is_new: z.boolean().optional(),
  }),
});

const heatmapSchema = z.object({
  page_url: z.string().url(),
  page_url_hash: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  page_height: z.number(),
  events: z.array(
    z.object({
      type: z.enum(["click", "move", "scroll"]),
      x: z.number().optional(),
      y: z.number().optional(),
      element: z.string().optional(),
      depth: z.number().optional(),
      timestamp: z.number(),
    })
  ),
});

export const collectRoutes: FastifyPluginAsync = async (fastify) => {
  // Main event collection endpoint
  fastify.post<{
    Body: z.infer<typeof collectSchema>;
    Headers: { "x-site-id"?: string };
  }>(
    "/",
    {
      preHandler: [rateLimiter, validateSite],
      schema: {
        headers: {
          type: "object",
          properties: {
            "x-site-id": { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const siteId = request.headers["x-site-id"];
      const clientIp =
        request.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        request.ip;
      const userAgent = request.headers["user-agent"] || "";

      // Validate body
      const result = collectSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: result.error.flatten(),
        });
      }

      const { events, session, visitor } = result.data;

      // Process each event
      const enrichedEvents: RawEvent[] = await Promise.all(
        events.map(async (event) => {
          const enriched = await enrichEvent({
            ...event,
            site_id: siteId!,
            session_id: session.id,
            visitor_id: visitor.id,
            is_new_session: session.is_new ?? false,
            is_new_visitor: visitor.is_new ?? false,
            client_ip: clientIp,
            user_agent: userAgent,
          });
          return enriched;
        })
      );

      // Add to processing queue
      await eventQueue.addBulk(
        enrichedEvents.map((event) => ({
          name: "process-event",
          data: event,
        }))
      );

      // Update real-time counters
      const now = Date.now();
      await redis.zadd(`realtime:${siteId}`, now, visitor.id);
      await redis.expire(`realtime:${siteId}`, 300); // 5 minutes TTL

      return reply.status(202).send({
        success: true,
        events_received: events.length,
      });
    }
  );

  // Heatmap data collection
  fastify.post<{
    Body: z.infer<typeof heatmapSchema>;
    Headers: { "x-site-id"?: string };
  }>(
    "/heatmap",
    {
      preHandler: [rateLimiter, validateSite],
    },
    async (request, reply) => {
      const siteId = request.headers["x-site-id"];

      const result = heatmapSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Invalid heatmap data" });
      }

      // Queue heatmap data for processing
      await eventQueue.add("process-heatmap", {
        site_id: siteId,
        ...result.data,
      });

      return reply.status(202).send({ success: true });
    }
  );

  // Beacon endpoint (for sendBeacon API)
  fastify.post("/beacon", async (request, reply) => {
    // Handle sendBeacon - same as main endpoint but with text/plain content-type
    try {
      const body =
        typeof request.body === "string"
          ? JSON.parse(request.body)
          : request.body;

      // Forward to main handler
      request.body = body;
      return fastify.inject({
        method: "POST",
        url: "/api/collect",
        headers: request.headers,
        payload: body,
      });
    } catch {
      return reply.status(400).send({ error: "Invalid beacon data" });
    }
  });
};
