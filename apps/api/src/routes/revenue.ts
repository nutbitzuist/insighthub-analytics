import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

interface RevenueEvent {
  siteId: string;
  visitorId: string;
  transactionId: string;
  transactionType: "one_time" | "subscription" | "refund";
  amount: number;
  currency: string;
  productId?: string;
  productName?: string;
  customerId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  mrrChange?: number;
}

export async function revenueRoutes(fastify: FastifyInstance) {
  // Stripe webhook handler
  fastify.post("/webhooks/stripe", async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return reply.status(500).send({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return reply.status(400).send({ error: "Invalid signature" });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return reply.status(200).send({ received: true });
  });

  // Get revenue stats
  fastify.get<{
    Params: { siteId: string };
    Querystring: { period?: string; start?: string; end?: string };
  }>("/sites/:siteId/revenue", async (request, reply) => {
    const { siteId } = request.params;
    const { period = "last_30_days" } = request.query;

    const { startDate, endDate } = getDateRange(period);

    const revenueEvents = await prisma.revenueEvent.findMany({
      where: {
        siteId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const metrics = calculateRevenueMetrics(revenueEvents);

    return reply.send({
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      metrics,
      events: revenueEvents.slice(0, 100),
    });
  });

  // Get MRR breakdown
  fastify.get<{
    Params: { siteId: string };
  }>("/sites/:siteId/revenue/mrr", async (request, reply) => {
    const { siteId } = request.params;

    const subscriptions = await prisma.revenueEvent.findMany({
      where: {
        siteId,
        transactionType: "subscription",
      },
      orderBy: { timestamp: "desc" },
    });

    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.mrrChange || 0), 0);

    return reply.send({
      mrr,
      subscriptionCount: subscriptions.length,
      avgSubscriptionValue: subscriptions.length > 0 ? mrr / subscriptions.length : 0,
    });
  });

  // Get revenue by source/channel
  fastify.get<{
    Params: { siteId: string };
    Querystring: { period?: string };
  }>("/sites/:siteId/revenue/attribution", async (request, reply) => {
    const { siteId } = request.params;
    const { period = "last_30_days" } = request.query;

    const { startDate, endDate } = getDateRange(period);

    const revenueBySource = await prisma.revenueEvent.groupBy({
      by: ["attributedSource", "attributedMedium", "attributedCampaign"],
      where: {
        siteId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amountUsd: true,
      },
      _count: true,
    });

    return reply.send({
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      attribution: revenueBySource.map((row) => ({
        source: row.attributedSource,
        medium: row.attributedMedium,
        campaign: row.attributedCampaign,
        revenue: row._sum.amountUsd || 0,
        conversions: row._count,
      })),
    });
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const siteId = session.metadata?.site_id;
  const visitorId = session.metadata?.visitor_id;

  if (!siteId) return;

  await prisma.revenueEvent.create({
    data: {
      siteId,
      visitorId: visitorId || "unknown",
      transactionId: session.id,
      transactionType: session.mode === "subscription" ? "subscription" : "one_time",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      amountUsd: await convertToUsd(session.amount_total || 0, session.currency || "usd"),
      customerId: session.customer as string,
      customerEmail: session.customer_email || undefined,
      attributedSource: session.metadata?.utm_source || "direct",
      attributedMedium: session.metadata?.utm_medium || "none",
      attributedCampaign: session.metadata?.utm_campaign || "none",
      attributedChannel: determineChannel(session.metadata?.utm_source, session.metadata?.utm_medium),
      timestamp: new Date(),
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const siteId = invoice.metadata?.site_id;
  if (!siteId) return;

  await prisma.revenueEvent.create({
    data: {
      siteId,
      visitorId: invoice.metadata?.visitor_id || "unknown",
      transactionId: invoice.id || "",
      transactionType: "subscription",
      amount: invoice.amount_paid,
      currency: invoice.currency,
      amountUsd: await convertToUsd(invoice.amount_paid, invoice.currency),
      subscriptionId: invoice.subscription as string,
      customerId: invoice.customer as string,
      mrrChange: invoice.amount_paid / 100,
      timestamp: new Date(),
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Payment failed for invoice:", invoice.id);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Subscription created:", subscription.id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Subscription updated:", subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const siteId = subscription.metadata?.site_id;
  if (!siteId) return;

  const mrr = subscription.items.data.reduce(
    (sum, item) => sum + (item.price.unit_amount || 0) / 100,
    0
  );

  await prisma.revenueEvent.create({
    data: {
      siteId,
      visitorId: subscription.metadata?.visitor_id || "unknown",
      transactionId: subscription.id,
      transactionType: "subscription",
      amount: 0,
      currency: subscription.currency,
      amountUsd: 0,
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      mrrChange: -mrr,
      timestamp: new Date(),
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const siteId = charge.metadata?.site_id;
  if (!siteId) return;

  await prisma.revenueEvent.create({
    data: {
      siteId,
      visitorId: charge.metadata?.visitor_id || "unknown",
      transactionId: charge.id,
      transactionType: "refund",
      amount: -(charge.amount_refunded || 0),
      currency: charge.currency,
      amountUsd: await convertToUsd(-(charge.amount_refunded || 0), charge.currency),
      customerId: charge.customer as string,
      timestamp: new Date(),
    },
  });
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "last_7_days":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "last_30_days":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "last_90_days":
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

function calculateRevenueMetrics(events: any[]) {
  const totalRevenue = events
    .filter((e) => e.transactionType !== "refund")
    .reduce((sum, e) => sum + e.amountUsd, 0);

  const refunds = events
    .filter((e) => e.transactionType === "refund")
    .reduce((sum, e) => sum + Math.abs(e.amountUsd), 0);

  const subscriptionRevenue = events
    .filter((e) => e.transactionType === "subscription")
    .reduce((sum, e) => sum + e.amountUsd, 0);

  const oneTimeRevenue = events
    .filter((e) => e.transactionType === "one_time")
    .reduce((sum, e) => sum + e.amountUsd, 0);

  return {
    totalRevenue,
    netRevenue: totalRevenue - refunds,
    refunds,
    subscriptionRevenue,
    oneTimeRevenue,
    transactionCount: events.length,
    avgOrderValue: events.length > 0 ? totalRevenue / events.length : 0,
  };
}

async function convertToUsd(amount: number, currency: string): Promise<number> {
  // Simplified conversion - in production, use a real exchange rate API
  const rates: Record<string, number> = {
    usd: 1,
    eur: 1.1,
    gbp: 1.27,
    jpy: 0.0067,
    cad: 0.74,
    aud: 0.65,
  };

  const rate = rates[currency.toLowerCase()] || 1;
  return (amount / 100) * rate;
}

function determineChannel(source?: string, medium?: string): string {
  if (!source || source === "direct") return "Direct";
  if (medium === "cpc" || medium === "ppc") return "Paid Search";
  if (medium === "social" || source?.includes("facebook") || source?.includes("twitter")) return "Social";
  if (medium === "email") return "Email";
  if (medium === "referral") return "Referral";
  if (medium === "organic") return "Organic Search";
  return "Other";
}
