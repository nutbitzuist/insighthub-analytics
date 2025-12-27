import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

// Cache site lookups for 5 minutes
const SITE_CACHE_TTL = 300;

export async function validateSite(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const siteId = request.headers["x-site-id"] as string;
  const origin = request.headers["origin"] as string;

  if (!siteId) {
    return reply.status(400).send({
      error: "Missing X-Site-ID header",
    });
  }

  // Check cache first
  const cacheKey = `site:${siteId}`;
  const cached = await redis.get(cacheKey);

  let site: any;
  if (cached) {
    site = JSON.parse(cached);
  } else {
    // Look up site in database
    site = await prisma.site.findUnique({
      where: { trackingId: siteId },
      select: {
        id: true,
        trackingId: true,
        domain: true,
        allowedHosts: true,
        isActive: true,
        enableHeatmaps: true,
        enableRecordings: true,
        anonymizeIps: true,
        respectDnt: true,
      },
    });

    if (site) {
      // Cache the result
      await redis.set(cacheKey, JSON.stringify(site), "EX", SITE_CACHE_TTL);
    }
  }

  if (!site) {
    return reply.status(404).send({
      error: "Site not found",
    });
  }

  if (!site.isActive) {
    return reply.status(403).send({
      error: "Site is inactive",
    });
  }

  // Validate origin
  if (origin) {
    const originHost = new URL(origin).hostname;
    const isAllowed =
      originHost === site.domain ||
      site.allowedHosts?.includes(originHost) ||
      originHost.endsWith(`.${site.domain}`);

    if (!isAllowed) {
      return reply.status(403).send({
        error: "Origin not allowed",
      });
    }
  }

  // Attach site to request for downstream use
  (request as any).site = site;
}
