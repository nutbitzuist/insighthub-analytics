import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import crypto from "crypto";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

export async function teamsRoutes(fastify: FastifyInstance) {
  // List organization members
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/members", async (request, reply) => {
    const { orgId } = request.params;

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return reply.send({ members });
  });

  // Invite a new member
  fastify.post<{
    Params: { orgId: string };
    Body: z.infer<typeof inviteSchema>;
  }>("/organizations/:orgId/invites", async (request, reply) => {
    const { orgId } = request.params;
    const data = inviteSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Check if already a member
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: existingUser.id },
      });

      if (existingMember) {
        return reply.status(400).send({ error: "User is already a member" });
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: { organizationId: orgId, email: data.email, status: "pending" },
    });

    if (existingInvite) {
      return reply.status(400).send({ error: "Invite already sent to this email" });
    }

    // Create invite
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: orgId,
        email: data.email,
        role: data.role,
        token: inviteToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // In production, send email with invite link
    const inviteUrl = `${process.env.APP_URL}/invite/${inviteToken}`;

    return reply.status(201).send({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      inviteUrl,
    });
  });

  // List pending invites
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/invites", async (request, reply) => {
    const { orgId } = request.params;

    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId: orgId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ invites });
  });

  // Cancel an invite
  fastify.delete<{
    Params: { orgId: string; inviteId: string };
  }>("/organizations/:orgId/invites/:inviteId", async (request, reply) => {
    const { orgId, inviteId } = request.params;

    const result = await prisma.organizationInvite.deleteMany({
      where: { id: inviteId, organizationId: orgId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "Invite not found" });
    }

    return reply.status(204).send();
  });

  // Accept an invite
  fastify.post<{
    Params: { token: string };
    Body: { userId: string };
  }>("/invites/:token/accept", async (request, reply) => {
    const { token } = request.params;
    const { userId } = request.body;

    const invite = await prisma.organizationInvite.findFirst({
      where: { token, status: "pending" },
    });

    if (!invite) {
      return reply.status(404).send({ error: "Invite not found or already used" });
    }

    if (new Date() > invite.expiresAt) {
      return reply.status(410).send({ error: "Invite has expired" });
    }

    // Create membership
    const membership = await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
    });

    // Mark invite as accepted
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });

    return reply.send({ membership });
  });

  // Update member role
  fastify.put<{
    Params: { orgId: string; memberId: string };
    Body: z.infer<typeof updateMemberSchema>;
  }>("/organizations/:orgId/members/:memberId", async (request, reply) => {
    const { orgId, memberId } = request.params;
    const data = updateMemberSchema.parse(request.body);

    // Prevent demoting the last owner
    if (data.role !== "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: "owner" },
      });

      const member = await prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId: orgId },
      });

      if (member?.role === "owner" && ownerCount <= 1) {
        return reply.status(400).send({ error: "Cannot demote the last owner" });
      }
    }

    const updated = await prisma.organizationMember.updateMany({
      where: { id: memberId, organizationId: orgId },
      data: { role: data.role },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ error: "Member not found" });
    }

    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return reply.send({ member });
  });

  // Remove a member
  fastify.delete<{
    Params: { orgId: string; memberId: string };
  }>("/organizations/:orgId/members/:memberId", async (request, reply) => {
    const { orgId, memberId } = request.params;

    // Prevent removing the last owner
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (member?.role === "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: "owner" },
      });

      if (ownerCount <= 1) {
        return reply.status(400).send({ error: "Cannot remove the last owner" });
      }
    }

    const result = await prisma.organizationMember.deleteMany({
      where: { id: memberId, organizationId: orgId },
    });

    if (result.count === 0) {
      return reply.status(404).send({ error: "Member not found" });
    }

    return reply.status(204).send();
  });

  // Leave organization
  fastify.post<{
    Params: { orgId: string };
    Body: { userId: string };
  }>("/organizations/:orgId/leave", async (request, reply) => {
    const { orgId } = request.params;
    const { userId } = request.body;

    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) {
      return reply.status(404).send({ error: "Not a member of this organization" });
    }

    // Prevent last owner from leaving
    if (member.role === "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: "owner" },
      });

      if (ownerCount <= 1) {
        return reply.status(400).send({
          error: "Cannot leave as the last owner. Transfer ownership first.",
        });
      }
    }

    await prisma.organizationMember.delete({
      where: { id: member.id },
    });

    return reply.send({ success: true });
  });

  // Transfer ownership
  fastify.post<{
    Params: { orgId: string };
    Body: { fromUserId: string; toMemberId: string };
  }>("/organizations/:orgId/transfer-ownership", async (request, reply) => {
    const { orgId } = request.params;
    const { fromUserId, toMemberId } = request.body;

    // Verify current user is owner
    const currentOwner = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: fromUserId, role: "owner" },
    });

    if (!currentOwner) {
      return reply.status(403).send({ error: "Only owners can transfer ownership" });
    }

    // Verify target member exists
    const targetMember = await prisma.organizationMember.findFirst({
      where: { id: toMemberId, organizationId: orgId },
    });

    if (!targetMember) {
      return reply.status(404).send({ error: "Target member not found" });
    }

    // Transfer ownership
    await prisma.$transaction([
      prisma.organizationMember.update({
        where: { id: targetMember.id },
        data: { role: "owner" },
      }),
      prisma.organizationMember.update({
        where: { id: currentOwner.id },
        data: { role: "admin" },
      }),
    ]);

    return reply.send({ success: true });
  });
}
