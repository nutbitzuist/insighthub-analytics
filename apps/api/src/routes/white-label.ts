import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const whiteLabelSchema = z.object({
  customDomain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  companyName: z.string().max(100).optional(),
  supportEmail: z.string().email().optional(),
  customCss: z.string().max(10000).optional(),
  hideInsightHubBranding: z.boolean().optional(),
  customFooterText: z.string().max(500).optional(),
  customLoginMessage: z.string().max(500).optional(),
});

export async function whiteLabelRoutes(fastify: FastifyInstance) {
  // Get white-label settings
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/white-label", async (request, reply) => {
    const { orgId } = request.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { whiteLabel: true },
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    // Check if org has white-label feature
    if (org.plan !== "enterprise") {
      return reply.status(403).send({
        error: "White-label is only available on Enterprise plan",
      });
    }

    return reply.send({
      whiteLabel: org.whiteLabel || {
        customDomain: null,
        logoUrl: null,
        faviconUrl: null,
        primaryColor: "#3B82F6",
        secondaryColor: "#1E40AF",
        companyName: org.name,
        hideInsightHubBranding: false,
      },
    });
  });

  // Update white-label settings
  fastify.put<{
    Params: { orgId: string };
    Body: z.infer<typeof whiteLabelSchema>;
  }>("/organizations/:orgId/white-label", async (request, reply) => {
    const { orgId } = request.params;
    const data = whiteLabelSchema.parse(request.body);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    if (org.plan !== "enterprise") {
      return reply.status(403).send({
        error: "White-label is only available on Enterprise plan",
      });
    }

    const whiteLabel = await prisma.whiteLabel.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
    });

    return reply.send({ whiteLabel });
  });

  // Verify custom domain
  fastify.post<{
    Params: { orgId: string };
    Body: { domain: string };
  }>("/organizations/:orgId/white-label/verify-domain", async (request, reply) => {
    const { orgId } = request.params;
    const { domain } = request.body;

    // Generate verification token
    const verificationToken = `insighthub-verify-${orgId.substring(0, 8)}`;

    // In production, check DNS records for verification
    const dnsInstructions = {
      type: "TXT",
      name: `_insighthub.${domain}`,
      value: verificationToken,
    };

    // Store pending verification
    await prisma.whiteLabel.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        customDomain: domain,
        domainVerified: false,
        domainVerificationToken: verificationToken,
      },
      update: {
        customDomain: domain,
        domainVerified: false,
        domainVerificationToken: verificationToken,
      },
    });

    return reply.send({
      domain,
      verificationToken,
      dnsInstructions,
      message: "Add the TXT record to your DNS and then verify",
    });
  });

  // Check domain verification status
  fastify.post<{
    Params: { orgId: string };
  }>("/organizations/:orgId/white-label/check-domain", async (request, reply) => {
    const { orgId } = request.params;

    const whiteLabel = await prisma.whiteLabel.findUnique({
      where: { organizationId: orgId },
    });

    if (!whiteLabel?.customDomain) {
      return reply.status(400).send({ error: "No custom domain configured" });
    }

    // In production, actually check DNS records
    // For now, simulate verification
    const isVerified = await verifyDomain(
      whiteLabel.customDomain,
      whiteLabel.domainVerificationToken || ""
    );

    if (isVerified) {
      await prisma.whiteLabel.update({
        where: { organizationId: orgId },
        data: { domainVerified: true },
      });
    }

    return reply.send({
      domain: whiteLabel.customDomain,
      verified: isVerified,
    });
  });

  // Upload logo
  fastify.post<{
    Params: { orgId: string };
  }>("/organizations/:orgId/white-label/logo", async (request, reply) => {
    const { orgId } = request.params;

    // In production, handle file upload to S3/CloudFlare R2
    // For now, return a placeholder
    const logoUrl = `https://storage.insighthub.io/orgs/${orgId}/logo.png`;

    await prisma.whiteLabel.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, logoUrl },
      update: { logoUrl },
    });

    return reply.send({ logoUrl });
  });

  // Get white-label config for custom domain (public endpoint)
  fastify.get<{
    Querystring: { domain: string };
  }>("/white-label/config", async (request, reply) => {
    const { domain } = request.query;

    if (!domain) {
      return reply.status(400).send({ error: "Domain is required" });
    }

    const whiteLabel = await prisma.whiteLabel.findFirst({
      where: {
        customDomain: domain,
        domainVerified: true,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!whiteLabel) {
      return reply.status(404).send({ error: "Domain not configured" });
    }

    return reply.send({
      companyName: whiteLabel.companyName || whiteLabel.organization.name,
      logoUrl: whiteLabel.logoUrl,
      faviconUrl: whiteLabel.faviconUrl,
      primaryColor: whiteLabel.primaryColor,
      secondaryColor: whiteLabel.secondaryColor,
      customCss: whiteLabel.customCss,
      hideInsightHubBranding: whiteLabel.hideInsightHubBranding,
      customFooterText: whiteLabel.customFooterText,
      customLoginMessage: whiteLabel.customLoginMessage,
    });
  });
}

async function verifyDomain(domain: string, token: string): Promise<boolean> {
  // In production, use DNS lookup to verify TXT record
  // For now, simulate verification
  try {
    // const dns = require('dns').promises;
    // const records = await dns.resolveTxt(`_insighthub.${domain}`);
    // return records.some(r => r.join('') === token);
    return true; // Simulated success
  } catch {
    return false;
  }
}
