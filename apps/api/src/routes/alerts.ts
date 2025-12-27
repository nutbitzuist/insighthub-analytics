import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const alertSchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.enum([
    "visitors",
    "pageviews",
    "bounce_rate",
    "avg_duration",
    "conversions",
    "revenue",
  ]),
  condition: z.enum(["above", "below", "change_percent"]),
  threshold: z.number(),
  comparisonPeriod: z.enum(["hour", "day", "week", "month"]).default("day"),
  notifyChannels: z.array(z.enum(["email", "slack", "webhook"])),
  webhookUrl: z.string().url().optional(),
  slackWebhookUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export async function alertsRoutes(fastify: FastifyInstance) {
  // List alerts for a site
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/alerts", async (request, reply) => {
    const { siteId } = request.params;

    const alerts = await prisma.alert.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ alerts });
  });

  // Create a new alert
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof alertSchema>;
  }>("/sites/:siteId/alerts", async (request, reply) => {
    const { siteId } = request.params;
    const data = alertSchema.parse(request.body);

    const alert = await prisma.alert.create({
      data: {
        siteId,
        name: data.name,
        metric: data.metric,
        condition: data.condition,
        threshold: data.threshold,
        comparisonPeriod: data.comparisonPeriod,
        notifyChannels: data.notifyChannels,
        webhookUrl: data.webhookUrl,
        slackWebhookUrl: data.slackWebhookUrl,
        isActive: data.isActive,
      },
    });

    return reply.status(201).send({ alert });
  });

  // Get alert details with history
  fastify.get<{
    Params: { siteId: string; alertId: string };
  }>("/sites/:siteId/alerts/:alertId", async (request, reply) => {
    const { siteId, alertId } = request.params;

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, siteId },
      include: {
        triggers: {
          orderBy: { triggeredAt: "desc" },
          take: 50,
        },
      },
    });

    if (!alert) {
      return reply.status(404).send({ error: "Alert not found" });
    }

    return reply.send({ alert });
  });

  // Update an alert
  fastify.put<{
    Params: { siteId: string; alertId: string };
    Body: Partial<z.infer<typeof alertSchema>>;
  }>("/sites/:siteId/alerts/:alertId", async (request, reply) => {
    const { siteId, alertId } = request.params;
    const data = alertSchema.partial().parse(request.body);

    const alert = await prisma.alert.updateMany({
      where: { id: alertId, siteId },
      data: {
        name: data.name,
        metric: data.metric,
        condition: data.condition,
        threshold: data.threshold,
        comparisonPeriod: data.comparisonPeriod,
        notifyChannels: data.notifyChannels,
        webhookUrl: data.webhookUrl,
        slackWebhookUrl: data.slackWebhookUrl,
        isActive: data.isActive,
      },
    });

    if (alert.count === 0) {
      return reply.status(404).send({ error: "Alert not found" });
    }

    const updated = await prisma.alert.findFirst({ where: { id: alertId } });
    return reply.send({ alert: updated });
  });

  // Delete an alert
  fastify.delete<{
    Params: { siteId: string; alertId: string };
  }>("/sites/:siteId/alerts/:alertId", async (request, reply) => {
    const { siteId, alertId } = request.params;

    const result = await prisma.alert.deleteMany({
      where: { id: alertId, siteId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "Alert not found" });
    }

    return reply.status(204).send();
  });

  // Test an alert (send test notification)
  fastify.post<{
    Params: { siteId: string; alertId: string };
  }>("/sites/:siteId/alerts/:alertId/test", async (request, reply) => {
    const { siteId, alertId } = request.params;

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, siteId },
    });

    if (!alert) {
      return reply.status(404).send({ error: "Alert not found" });
    }

    // Send test notifications
    const results = await sendAlertNotifications(alert, {
      metric: alert.metric,
      currentValue: 100,
      threshold: alert.threshold,
      isTest: true,
    });

    return reply.send({ success: true, results });
  });
}

interface AlertNotificationPayload {
  metric: string;
  currentValue: number;
  threshold: number;
  isTest?: boolean;
}

async function sendAlertNotifications(
  alert: any,
  payload: AlertNotificationPayload
): Promise<{ channel: string; success: boolean; error?: string }[]> {
  const results: { channel: string; success: boolean; error?: string }[] = [];

  for (const channel of alert.notifyChannels) {
    try {
      switch (channel) {
        case "email":
          // In production, integrate with email service (SendGrid, Resend, etc.)
          console.log(`Sending email alert for ${alert.name}`);
          results.push({ channel: "email", success: true });
          break;

        case "slack":
          if (alert.slackWebhookUrl) {
            await fetch(alert.slackWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: payload.isTest
                  ? `🧪 Test Alert: ${alert.name}`
                  : `⚠️ Alert Triggered: ${alert.name}`,
                blocks: [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*${payload.isTest ? "Test " : ""}Alert: ${alert.name}*\n` +
                        `Metric: ${payload.metric}\n` +
                        `Current Value: ${payload.currentValue}\n` +
                        `Threshold: ${payload.threshold}`,
                    },
                  },
                ],
              }),
            });
            results.push({ channel: "slack", success: true });
          }
          break;

        case "webhook":
          if (alert.webhookUrl) {
            await fetch(alert.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                alertId: alert.id,
                alertName: alert.name,
                ...payload,
                triggeredAt: new Date().toISOString(),
              }),
            });
            results.push({ channel: "webhook", success: true });
          }
          break;
      }
    } catch (error: any) {
      results.push({ channel, success: false, error: error.message });
    }
  }

  return results;
}

// Alert checker job (to be run periodically)
export async function checkAlerts() {
  const activeAlerts = await prisma.alert.findMany({
    where: { isActive: true },
    include: { site: true },
  });

  for (const alert of activeAlerts) {
    try {
      const currentValue = await getMetricValue(alert.siteId, alert.metric, alert.comparisonPeriod);
      const shouldTrigger = evaluateAlertCondition(alert, currentValue);

      if (shouldTrigger) {
        // Record trigger
        await prisma.alertTrigger.create({
          data: {
            alertId: alert.id,
            metricValue: currentValue,
            threshold: alert.threshold,
            triggeredAt: new Date(),
          },
        });

        // Send notifications
        await sendAlertNotifications(alert, {
          metric: alert.metric,
          currentValue,
          threshold: alert.threshold,
        });
      }
    } catch (error) {
      console.error(`Failed to check alert ${alert.id}:`, error);
    }
  }
}

async function getMetricValue(
  siteId: string,
  metric: string,
  period: string
): Promise<number> {
  // Simplified - in production, query ClickHouse for actual metrics
  return Math.random() * 1000;
}

function evaluateAlertCondition(alert: any, currentValue: number): boolean {
  switch (alert.condition) {
    case "above":
      return currentValue > alert.threshold;
    case "below":
      return currentValue < alert.threshold;
    case "change_percent":
      // Would need previous value to calculate change
      return false;
    default:
      return false;
  }
}
