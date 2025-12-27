import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255),
  allowedHosts: z.array(z.string()).optional(),
});

export const sitesRoutes: FastifyPluginAsync = async (fastify) => {
  // List sites for organization
  fastify.get("/", async (request, reply) => {
    // TODO: Get org from auth
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { data: sites };
  });

  // Get single site
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const site = await prisma.site.findUnique({
      where: { id: request.params.id },
    });
    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }
    return { data: site };
  });

  // Create site
  fastify.post("/", async (request, reply) => {
    const result = createSiteSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }

    const trackingId = "ih_" + Math.random().toString(36).substring(2, 14);

    const site = await prisma.site.create({
      data: {
        ...result.data,
        trackingId,
        organizationId: "TODO", // Get from auth
      },
    });

    return reply.status(201).send({ data: site });
  });

  // Update site
  fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const site = await prisma.site.update({
      where: { id: request.params.id },
      data: request.body as any,
    });
    return { data: site };
  });

  // Delete site
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await prisma.site.delete({
      where: { id: request.params.id },
    });
    return reply.status(204).send();
  });

  // Get tracking snippet
  fastify.get<{ Params: { id: string } }>("/:id/snippet", async (request, reply) => {
    const site = await prisma.site.findUnique({
      where: { id: request.params.id },
      select: { trackingId: true },
    });

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const snippet = `<!-- InsightHub Analytics -->
<script>
  (function(i,n,s,h,u,b){i['InsightHubObject']=u;i[u]=i[u]||function(){
  (i[u].q=i[u].q||[]).push(arguments)};i[u].l=1*new Date();b=n.createElement(s);
  b.async=1;b.src=h;n.head.appendChild(b)
  })(window,document,'script','https://cdn.insighthub.io/v1/ih.js','insighthub');
  
  insighthub('init', '${site.trackingId}');
</script>
<!-- End InsightHub Analytics -->`;

    return { data: { snippet, trackingId: site.trackingId } };
  });
};
