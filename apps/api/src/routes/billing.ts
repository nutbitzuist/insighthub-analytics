import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    limits: {
      sites: 1,
      eventsPerMonth: 10000,
      teamMembers: 1,
      dataRetentionDays: 30,
      features: ["basic_analytics"],
    },
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    limits: {
      sites: 3,
      eventsPerMonth: 100000,
      teamMembers: 3,
      dataRetentionDays: 90,
      features: ["basic_analytics", "goals", "funnels", "custom_events"],
    },
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: {
      sites: 10,
      eventsPerMonth: 1000000,
      teamMembers: 10,
      dataRetentionDays: 365,
      features: [
        "basic_analytics",
        "goals",
        "funnels",
        "custom_events",
        "heatmaps",
        "revenue_tracking",
        "api_access",
        "alerts",
      ],
    },
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    limits: {
      sites: -1, // unlimited
      eventsPerMonth: -1, // unlimited
      teamMembers: -1, // unlimited
      dataRetentionDays: -1, // unlimited
      features: [
        "basic_analytics",
        "goals",
        "funnels",
        "custom_events",
        "heatmaps",
        "revenue_tracking",
        "api_access",
        "alerts",
        "white_label",
        "priority_support",
        "custom_integrations",
      ],
    },
  },
};

export async function billingRoutes(fastify: FastifyInstance) {
  // Get current subscription
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/billing", async (request, reply) => {
    const { orgId } = request.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    const plan = PLANS[org.plan as keyof typeof PLANS] || PLANS.free;
    const usage = await getUsage(orgId);

    return reply.send({
      plan: {
        name: plan.name,
        limits: plan.limits,
      },
      subscription: org.subscription,
      usage,
      canUpgrade: org.plan !== "enterprise",
    });
  });

  // Get available plans
  fastify.get("/billing/plans", async (request, reply) => {
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      limits: plan.limits,
    }));

    return reply.send({ plans });
  });

  // Create checkout session for upgrade
  fastify.post<{
    Params: { orgId: string };
    Body: { planId: string; successUrl: string; cancelUrl: string };
  }>("/organizations/:orgId/billing/checkout", async (request, reply) => {
    const { orgId } = request.params;
    const { planId, successUrl, cancelUrl } = request.body;

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || !plan.priceId) {
      return reply.status(400).send({ error: "Invalid plan" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    // Create or get Stripe customer
    let customerId = org.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organizationId: orgId },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { organizationId: orgId, planId },
    });

    return reply.send({ checkoutUrl: session.url });
  });

  // Create customer portal session
  fastify.post<{
    Params: { orgId: string };
    Body: { returnUrl: string };
  }>("/organizations/:orgId/billing/portal", async (request, reply) => {
    const { orgId } = request.params;
    const { returnUrl } = request.body;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org?.subscription?.stripeCustomerId) {
      return reply.status(400).send({ error: "No active subscription" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return reply.send({ portalUrl: session.url });
  });

  // Stripe webhook handler
  fastify.post("/webhooks/stripe/billing", async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return reply.status(500).send({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body as string,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      return reply.status(400).send({ error: "Invalid signature" });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancel(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return reply.send({ received: true });
  });

  // Get invoices
  fastify.get<{
    Params: { orgId: string };
  }>("/organizations/:orgId/billing/invoices", async (request, reply) => {
    const { orgId } = request.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org?.subscription?.stripeCustomerId) {
      return reply.send({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: org.subscription.stripeCustomerId,
      limit: 24,
    });

    return reply.send({
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        paidAt: inv.status_transitions.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
          : null,
        invoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
      })),
    });
  });

  // Cancel subscription
  fastify.post<{
    Params: { orgId: string };
    Body: { cancelAtPeriodEnd?: boolean };
  }>("/organizations/:orgId/billing/cancel", async (request, reply) => {
    const { orgId } = request.params;
    const { cancelAtPeriodEnd = true } = request.body;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org?.subscription?.stripeSubscriptionId) {
      return reply.status(400).send({ error: "No active subscription" });
    }

    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(org.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(org.subscription.stripeSubscriptionId);
    }

    return reply.send({ success: true, cancelAtPeriodEnd });
  });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organizationId;
  const planId = session.metadata?.planId;

  if (!orgId || !planId) return;

  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      stripeSubscriptionId: session.subscription as string,
      status: "active",
    },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { plan: planId },
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionCancel(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "canceled" },
  });

  await prisma.organization.update({
    where: { id: sub.organizationId },
    data: { plan: "free" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due" },
  });
}

async function getUsage(orgId: string): Promise<{
  sites: number;
  eventsThisMonth: number;
  teamMembers: number;
}> {
  const [sites, members] = await Promise.all([
    prisma.site.count({ where: { organizationId: orgId } }),
    prisma.organizationMember.count({ where: { organizationId: orgId } }),
  ]);

  // In production, query ClickHouse for actual event count
  const eventsThisMonth = 0;

  return { sites, eventsThisMonth, teamMembers: members };
}
