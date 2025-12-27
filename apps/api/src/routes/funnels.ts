import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const funnelStepSchema = z.object({
  name: z.string().min(1),
  stepType: z.enum(["pageview", "event"]),
  config: z.object({
    urlPattern: z.string().optional(),
    eventName: z.string().optional(),
    eventProperties: z.record(z.any()).optional(),
  }),
  isRequired: z.boolean().default(true),
});

const funnelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  steps: z.array(funnelStepSchema).min(2).max(10),
});

export async function funnelsRoutes(fastify: FastifyInstance) {
  // List funnels for a site
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/funnels", async (request, reply) => {
    const { siteId } = request.params;

    const funnels = await prisma.funnel.findMany({
      where: { siteId },
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ funnels });
  });

  // Create a new funnel
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof funnelSchema>;
  }>("/sites/:siteId/funnels", async (request, reply) => {
    const { siteId } = request.params;
    const data = funnelSchema.parse(request.body);

    const funnel = await prisma.funnel.create({
      data: {
        siteId,
        name: data.name,
        description: data.description,
        steps: {
          create: data.steps.map((step, index) => ({
            order: index + 1,
            name: step.name,
            stepType: step.stepType,
            config: step.config,
            isRequired: step.isRequired,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    return reply.status(201).send({ funnel });
  });

  // Get funnel with conversion data
  fastify.get<{
    Params: { siteId: string; funnelId: string };
    Querystring: { period?: string };
  }>("/sites/:siteId/funnels/:funnelId", async (request, reply) => {
    const { siteId, funnelId } = request.params;
    const { period = "last_30_days" } = request.query;

    const funnel = await prisma.funnel.findFirst({
      where: { id: funnelId, siteId },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    const { startDate, endDate } = getDateRange(period);
    const funnelData = await calculateFunnelConversions(funnel, startDate, endDate);

    return reply.send({
      funnel,
      data: funnelData,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
    });
  });

  // Update a funnel
  fastify.put<{
    Params: { siteId: string; funnelId: string };
    Body: Partial<z.infer<typeof funnelSchema>>;
  }>("/sites/:siteId/funnels/:funnelId", async (request, reply) => {
    const { siteId, funnelId } = request.params;
    const data = funnelSchema.partial().parse(request.body);

    // Delete existing steps and recreate
    await prisma.funnelStep.deleteMany({ where: { funnelId } });

    const funnel = await prisma.funnel.update({
      where: { id: funnelId },
      data: {
        name: data.name,
        description: data.description,
        steps: data.steps
          ? {
              create: data.steps.map((step, index) => ({
                order: index + 1,
                name: step.name,
                stepType: step.stepType,
                config: step.config,
                isRequired: step.isRequired,
              })),
            }
          : undefined,
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    return reply.send({ funnel });
  });

  // Delete a funnel
  fastify.delete<{
    Params: { siteId: string; funnelId: string };
  }>("/sites/:siteId/funnels/:funnelId", async (request, reply) => {
    const { siteId, funnelId } = request.params;

    await prisma.funnelStep.deleteMany({ where: { funnelId } });
    const result = await prisma.funnel.deleteMany({
      where: { id: funnelId, siteId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    return reply.status(204).send();
  });
}

interface FunnelWithSteps {
  id: string;
  steps: Array<{
    id: string;
    order: number;
    name: string;
    stepType: string;
    config: any;
  }>;
}

async function calculateFunnelConversions(
  funnel: FunnelWithSteps,
  startDate: Date,
  endDate: Date
): Promise<{
  steps: Array<{
    step: number;
    name: string;
    visitors: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
}> {
  // This is a simplified implementation
  // In production, you would query ClickHouse for actual funnel data
  const steps = funnel.steps.map((step, index) => {
    // Simulate decreasing visitors through funnel
    const baseVisitors = 1000;
    const dropoffPerStep = 0.3;
    const visitors = Math.round(baseVisitors * Math.pow(1 - dropoffPerStep, index));
    const prevVisitors = index === 0 ? baseVisitors : Math.round(baseVisitors * Math.pow(1 - dropoffPerStep, index - 1));

    return {
      step: step.order,
      name: step.name,
      visitors,
      conversionRate: index === 0 ? 100 : (visitors / prevVisitors) * 100,
      dropoffRate: index === 0 ? 0 : ((prevVisitors - visitors) / prevVisitors) * 100,
    };
  });

  const firstStepVisitors = steps[0]?.visitors || 0;
  const lastStepVisitors = steps[steps.length - 1]?.visitors || 0;
  const overallConversionRate = firstStepVisitors > 0 ? (lastStepVisitors / firstStepVisitors) * 100 : 0;

  return { steps, overallConversionRate };
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
