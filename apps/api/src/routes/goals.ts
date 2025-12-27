import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const goalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  goalType: z.enum(["destination", "event", "duration", "pages"]),
  config: z.object({
    matchType: z.enum(["exact", "contains", "regex"]).optional(),
    pattern: z.string().optional(),
    eventName: z.string().optional(),
    eventProperties: z.record(z.any()).optional(),
    operator: z.enum(["gte", "lte"]).optional(),
    value: z.number().optional(),
  }),
  isActive: z.boolean().default(true),
});

export async function goalsRoutes(fastify: FastifyInstance) {
  // List goals for a site
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/goals", async (request, reply) => {
    const { siteId } = request.params;

    const goals = await prisma.goal.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ goals });
  });

  // Create a new goal
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof goalSchema>;
  }>("/sites/:siteId/goals", async (request, reply) => {
    const { siteId } = request.params;
    const data = goalSchema.parse(request.body);

    const goal = await prisma.goal.create({
      data: {
        siteId,
        name: data.name,
        description: data.description,
        goalType: data.goalType,
        config: data.config,
        isActive: data.isActive,
      },
    });

    return reply.status(201).send({ goal });
  });

  // Get goal details with conversions
  fastify.get<{
    Params: { siteId: string; goalId: string };
    Querystring: { period?: string };
  }>("/sites/:siteId/goals/:goalId", async (request, reply) => {
    const { siteId, goalId } = request.params;
    const { period = "last_30_days" } = request.query;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, siteId },
    });

    if (!goal) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    const { startDate, endDate } = getDateRange(period);

    const conversions = await prisma.goalConversion.findMany({
      where: {
        goalId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const conversionRate = await calculateConversionRate(siteId, goalId, startDate, endDate);

    return reply.send({
      goal,
      conversions: conversions.slice(0, 100),
      stats: {
        totalConversions: conversions.length,
        conversionRate,
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
      },
    });
  });

  // Update a goal
  fastify.put<{
    Params: { siteId: string; goalId: string };
    Body: Partial<z.infer<typeof goalSchema>>;
  }>("/sites/:siteId/goals/:goalId", async (request, reply) => {
    const { siteId, goalId } = request.params;
    const data = goalSchema.partial().parse(request.body);

    const goal = await prisma.goal.updateMany({
      where: { id: goalId, siteId },
      data: {
        name: data.name,
        description: data.description,
        goalType: data.goalType,
        config: data.config,
        isActive: data.isActive,
      },
    });

    if (goal.count === 0) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    const updated = await prisma.goal.findFirst({ where: { id: goalId } });
    return reply.send({ goal: updated });
  });

  // Delete a goal
  fastify.delete<{
    Params: { siteId: string; goalId: string };
  }>("/sites/:siteId/goals/:goalId", async (request, reply) => {
    const { siteId, goalId } = request.params;

    const result = await prisma.goal.deleteMany({
      where: { id: goalId, siteId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    return reply.status(204).send();
  });

  // Track goal conversion
  fastify.post<{
    Params: { siteId: string; goalId: string };
    Body: { visitorId: string; sessionId: string; value?: number };
  }>("/sites/:siteId/goals/:goalId/convert", async (request, reply) => {
    const { siteId, goalId } = request.params;
    const { visitorId, sessionId, value } = request.body;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, siteId, isActive: true },
    });

    if (!goal) {
      return reply.status(404).send({ error: "Goal not found or inactive" });
    }

    const conversion = await prisma.goalConversion.create({
      data: {
        goalId,
        visitorId,
        sessionId,
        value: value || 0,
        timestamp: new Date(),
      },
    });

    return reply.status(201).send({ conversion });
  });
}

async function calculateConversionRate(
  siteId: string,
  goalId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const [conversions, sessions] = await Promise.all([
    prisma.goalConversion.count({
      where: {
        goalId,
        timestamp: { gte: startDate, lte: endDate },
      },
    }),
    prisma.session.count({
      where: {
        siteId,
        startedAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  return sessions > 0 ? (conversions / sessions) * 100 : 0;
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_7_days":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "last_30_days":
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}
