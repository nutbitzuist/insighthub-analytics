import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import crypto from "crypto";

const shareSettingsSchema = z.object({
  isPublic: z.boolean(),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  allowedMetrics: z.array(z.string()).optional(),
  customSlug: z.string().min(3).max(50).optional(),
});

export async function sharingRoutes(fastify: FastifyInstance) {
  // Get sharing settings for a site
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/sharing", async (request, reply) => {
    const { siteId } = request.params;

    const sharing = await prisma.publicShare.findFirst({
      where: { siteId },
    });

    if (!sharing) {
      return reply.send({
        isPublic: false,
        shareUrl: null,
      });
    }

    return reply.send({
      isPublic: sharing.isPublic,
      shareUrl: sharing.isPublic ? `/share/${sharing.shareToken}` : null,
      customSlug: sharing.customSlug,
      hasPassword: !!sharing.passwordHash,
      expiresAt: sharing.expiresAt,
      allowedMetrics: sharing.allowedMetrics,
      createdAt: sharing.createdAt,
    });
  });

  // Update sharing settings
  fastify.put<{
    Params: { siteId: string };
    Body: z.infer<typeof shareSettingsSchema>;
  }>("/sites/:siteId/sharing", async (request, reply) => {
    const { siteId } = request.params;
    const data = shareSettingsSchema.parse(request.body);

    const shareToken = crypto.randomBytes(16).toString("hex");
    const passwordHash = data.password
      ? crypto.createHash("sha256").update(data.password).digest("hex")
      : null;

    const sharing = await prisma.publicShare.upsert({
      where: { siteId },
      create: {
        siteId,
        shareToken,
        customSlug: data.customSlug,
        isPublic: data.isPublic,
        passwordHash,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        allowedMetrics: data.allowedMetrics || [],
      },
      update: {
        isPublic: data.isPublic,
        customSlug: data.customSlug,
        passwordHash: data.password !== undefined ? passwordHash : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        allowedMetrics: data.allowedMetrics,
      },
    });

    return reply.send({
      isPublic: sharing.isPublic,
      shareUrl: sharing.isPublic ? `/share/${sharing.customSlug || sharing.shareToken}` : null,
      customSlug: sharing.customSlug,
      hasPassword: !!sharing.passwordHash,
      expiresAt: sharing.expiresAt,
    });
  });

  // Regenerate share token
  fastify.post<{
    Params: { siteId: string };
  }>("/sites/:siteId/sharing/regenerate", async (request, reply) => {
    const { siteId } = request.params;

    const newToken = crypto.randomBytes(16).toString("hex");

    const sharing = await prisma.publicShare.update({
      where: { siteId },
      data: { shareToken: newToken },
    });

    return reply.send({
      shareUrl: `/share/${sharing.customSlug || sharing.shareToken}`,
    });
  });

  // Public dashboard access (no auth required)
  fastify.get<{
    Params: { token: string };
    Querystring: { password?: string; period?: string };
  }>("/share/:token", async (request, reply) => {
    const { token } = request.params;
    const { password, period = "last_7_days" } = request.query;

    const sharing = await prisma.publicShare.findFirst({
      where: {
        OR: [{ shareToken: token }, { customSlug: token }],
        isPublic: true,
      },
      include: { site: true },
    });

    if (!sharing) {
      return reply.status(404).send({ error: "Dashboard not found" });
    }

    // Check expiration
    if (sharing.expiresAt && new Date() > sharing.expiresAt) {
      return reply.status(410).send({ error: "This shared dashboard has expired" });
    }

    // Check password
    if (sharing.passwordHash) {
      if (!password) {
        return reply.status(401).send({ error: "Password required", requiresPassword: true });
      }
      const providedHash = crypto.createHash("sha256").update(password).digest("hex");
      if (providedHash !== sharing.passwordHash) {
        return reply.status(401).send({ error: "Invalid password" });
      }
    }

    // Get dashboard data
    const { startDate, endDate } = getDateRange(period);
    const dashboardData = await getPublicDashboardData(
      sharing.siteId,
      sharing.allowedMetrics as string[],
      startDate,
      endDate
    );

    return reply.send({
      site: {
        name: sharing.site.name,
        domain: sharing.site.domain,
      },
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      ...dashboardData,
    });
  });

  // Embed code generator
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/sharing/embed", async (request, reply) => {
    const { siteId } = request.params;

    const sharing = await prisma.publicShare.findFirst({
      where: { siteId, isPublic: true },
    });

    if (!sharing) {
      return reply.status(404).send({ error: "Public sharing not enabled" });
    }

    const embedUrl = `${process.env.APP_URL}/embed/${sharing.customSlug || sharing.shareToken}`;
    const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    return reply.send({
      embedUrl,
      embedCode,
      shareUrl: `/share/${sharing.customSlug || sharing.shareToken}`,
    });
  });
}

async function getPublicDashboardData(
  siteId: string,
  allowedMetrics: string[],
  startDate: Date,
  endDate: Date
): Promise<any> {
  // Simplified - in production, query actual data
  const allMetrics = {
    visitors: { value: 12500, change: 15.2 },
    pageviews: { value: 45000, change: 8.7 },
    bounceRate: { value: 42.5, change: -3.2 },
    avgDuration: { value: 185, change: 12.1 },
  };

  // Filter to allowed metrics if specified
  const metrics =
    allowedMetrics && allowedMetrics.length > 0
      ? Object.fromEntries(
          Object.entries(allMetrics).filter(([key]) => allowedMetrics.includes(key))
        )
      : allMetrics;

  return {
    metrics,
    timeseries: generateMockTimeseries(startDate, endDate),
    topPages: [
      { path: "/", pageviews: 15000 },
      { path: "/pricing", pageviews: 8500 },
      { path: "/features", pageviews: 6200 },
      { path: "/blog", pageviews: 4800 },
      { path: "/about", pageviews: 3200 },
    ],
    topSources: [
      { source: "google", visitors: 5200 },
      { source: "direct", visitors: 3800 },
      { source: "twitter", visitors: 1500 },
      { source: "github", visitors: 1200 },
      { source: "linkedin", visitors: 800 },
    ],
  };
}

function generateMockTimeseries(startDate: Date, endDate: Date): any[] {
  const data = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    data.push({
      date: current.toISOString().split("T")[0],
      visitors: Math.floor(Math.random() * 500) + 200,
      pageviews: Math.floor(Math.random() * 1500) + 500,
    });
    current.setDate(current.getDate() + 1);
  }

  return data;
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
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}
