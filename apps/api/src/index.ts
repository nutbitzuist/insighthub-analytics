import Fastify from "fastify";
import cors from "@fastify/cors";
import { collectRoutes } from "./routes/collect.js";
import { sitesRoutes } from "./routes/sites.js";
import { statsRoutes } from "./routes/stats.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { revenueRoutes } from "./routes/revenue.js";
import { goalsRoutes } from "./routes/goals.js";
import { funnelsRoutes } from "./routes/funnels.js";
import { eventsRoutes } from "./routes/events.js";
import { heatmapsRoutes } from "./routes/heatmaps.js";
import { alertsRoutes } from "./routes/alerts.js";
import { sharingRoutes } from "./routes/sharing.js";
import { apiKeysRoutes } from "./routes/api-keys.js";
import { teamsRoutes } from "./routes/teams.js";
import { billingRoutes } from "./routes/billing.js";
import { whiteLabelRoutes } from "./routes/white-label.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { clickhouse } from "./lib/clickhouse.js";
import "dotenv/config";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

// CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// API Routes
fastify.register(collectRoutes, { prefix: "/api/collect" });
fastify.register(sitesRoutes, { prefix: "/api/sites" });
fastify.register(statsRoutes, { prefix: "/api/stats" });
fastify.register(webhooksRoutes, { prefix: "/api/webhooks" });

// Phase 2: Revenue, Goals, Funnels, Events
fastify.register(revenueRoutes, { prefix: "/api" });
fastify.register(goalsRoutes, { prefix: "/api" });
fastify.register(funnelsRoutes, { prefix: "/api" });
fastify.register(eventsRoutes, { prefix: "/api" });

// Phase 3: Heatmaps, Alerts, Sharing
fastify.register(heatmapsRoutes, { prefix: "/api" });
fastify.register(alertsRoutes, { prefix: "/api" });
fastify.register(sharingRoutes, { prefix: "/api" });

// Phase 4: API Keys, Teams, Billing, White-label
fastify.register(apiKeysRoutes, { prefix: "/api" });
fastify.register(teamsRoutes, { prefix: "/api" });
fastify.register(billingRoutes, { prefix: "/api" });
fastify.register(whiteLabelRoutes, { prefix: "/api" });

// Graceful shutdown
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    await fastify.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3001", 10);
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    fastify.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
