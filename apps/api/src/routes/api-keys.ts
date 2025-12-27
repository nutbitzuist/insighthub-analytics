import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import crypto from "crypto";

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(
    z.enum([
      "read:stats",
      "read:events",
      "write:events",
      "read:goals",
      "write:goals",
      "read:funnels",
      "write:funnels",
      "read:heatmaps",
      "admin",
    ])
  ),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().min(100).max(100000).default(1000),
});

export async function apiKeysRoutes(fastify: FastifyInstance) {
  // List API keys for an organization
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/api-keys", async (request, reply) => {
    const { orgId } = request.params;

    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ apiKeys });
  });

  // Create a new API key
  fastify.post<{
    Params: { orgId: string };
    Body: z.infer<typeof apiKeySchema>;
  }>("/organizations/:orgId/api-keys", async (request, reply) => {
    const { orgId } = request.params;
    const data = apiKeySchema.parse(request.body);

    // Generate API key
    const keyValue = `ih_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(keyValue).digest("hex");
    const keyPrefix = keyValue.substring(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: orgId,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        rateLimit: data.rateLimit,
      },
    });

    // Return the full key only once
    return reply.status(201).send({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: keyValue, // Only shown once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt,
      },
      warning: "Save this API key securely. It will not be shown again.",
    });
  });

  // Get API key details
  fastify.get<{
    Params: { orgId: string; keyId: string };
  }>("/organizations/:orgId/api-keys/:keyId", async (request, reply) => {
    const { orgId, keyId } = request.params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        requestCount: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: "API key not found" });
    }

    return reply.send({ apiKey });
  });

  // Update API key
  fastify.put<{
    Params: { orgId: string; keyId: string };
    Body: Partial<z.infer<typeof apiKeySchema>>;
  }>("/organizations/:orgId/api-keys/:keyId", async (request, reply) => {
    const { orgId, keyId } = request.params;
    const data = apiKeySchema.partial().parse(request.body);

    const apiKey = await prisma.apiKey.updateMany({
      where: { id: keyId, organizationId: orgId },
      data: {
        name: data.name,
        scopes: data.scopes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        rateLimit: data.rateLimit,
      },
    });

    if (apiKey.count === 0) {
      return reply.status(404).send({ error: "API key not found" });
    }

    const updated = await prisma.apiKey.findFirst({
      where: { id: keyId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        rateLimit: true,
      },
    });

    return reply.send({ apiKey: updated });
  });

  // Revoke (delete) API key
  fastify.delete<{
    Params: { orgId: string; keyId: string };
  }>("/organizations/:orgId/api-keys/:keyId", async (request, reply) => {
    const { orgId, keyId } = request.params;

    const result = await prisma.apiKey.deleteMany({
      where: { id: keyId, organizationId: orgId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "API key not found" });
    }

    return reply.status(204).send();
  });

  // Rotate API key (generate new key, keep settings)
  fastify.post<{
    Params: { orgId: string; keyId: string };
  }>("/organizations/:orgId/api-keys/:keyId/rotate", async (request, reply) => {
    const { orgId, keyId } = request.params;

    const existingKey = await prisma.apiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
    });

    if (!existingKey) {
      return reply.status(404).send({ error: "API key not found" });
    }

    // Generate new key
    const keyValue = `ih_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(keyValue).digest("hex");
    const keyPrefix = keyValue.substring(0, 12);

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        keyHash,
        keyPrefix,
        lastUsedAt: null,
        requestCount: 0,
      },
    });

    return reply.send({
      key: keyValue,
      keyPrefix,
      warning: "Save this new API key securely. The old key is now invalid.",
    });
  });
}

// API key validation middleware
export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; organizationId?: string; scopes?: string[]; error?: string }> {
  if (!apiKey || !apiKey.startsWith("ih_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const key = await prisma.apiKey.findFirst({
    where: { keyHash },
  });

  if (!key) {
    return { valid: false, error: "API key not found" };
  }

  // Check expiration
  if (key.expiresAt && new Date() > key.expiresAt) {
    return { valid: false, error: "API key has expired" };
  }

  // Update usage stats
  await prisma.apiKey.update({
    where: { id: key.id },
    data: {
      lastUsedAt: new Date(),
      requestCount: { increment: 1 },
    },
  });

  return {
    valid: true,
    organizationId: key.organizationId,
    scopes: key.scopes as string[],
  };
}

// Check if API key has required scope
export function hasScope(scopes: string[], requiredScope: string): boolean {
  if (scopes.includes("admin")) return true;
  return scopes.includes(requiredScope);
}
