import { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { clickhouse } from "../lib/clickhouse.js";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  // Stripe webhook
  fastify.post<{ Params: { siteId: string } }>(
    "/stripe/:siteId",
    {
      config: {
        rawBody: true, // Need raw body for signature verification
      },
    },
    async (request, reply) => {
      const { siteId } = request.params;
      const signature = request.headers["stripe-signature"] as string;

      if (!signature) {
        return reply.status(400).send({ error: "Missing signature" });
      }

      // Get webhook secret for this site
      const integration = await prisma.paymentIntegration.findFirst({
        where: { siteId, provider: "stripe", isActive: true },
      });

      if (!integration || !integration.webhookSecretEncrypted) {
        return reply.status(404).send({ error: "Integration not found" });
      }

      // Decrypt webhook secret (implement your decryption logic)
      const webhookSecret = decryptSecret(integration.webhookSecretEncrypted);

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody as Buffer,
          signature,
          webhookSecret
        );
      } catch (err) {
        return reply.status(400).send({ error: "Invalid signature" });
      }

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutComplete(siteId, event.data.object as Stripe.Checkout.Session);
          break;

        case "payment_intent.succeeded":
          await handlePaymentSuccess(siteId, event.data.object as Stripe.PaymentIntent);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscription(siteId, event.data.object as Stripe.Subscription, event.type);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionCancelled(siteId, event.data.object as Stripe.Subscription);
          break;

        case "invoice.paid":
          await handleInvoicePaid(siteId, event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    }
  );
};

async function handleCheckoutComplete(siteId: string, session: Stripe.Checkout.Session) {
  // Get visitor ID from client_reference_id
  const visitorId = session.client_reference_id;
  if (!visitorId) {
    console.log("No visitor ID in checkout session");
    return;
  }

  const amount = (session.amount_total || 0) / 100;
  const currency = session.currency?.toUpperCase() || "USD";

  // Get customer email
  const customerEmail = session.customer_details?.email || "";

  // Find visitor's attribution data from ClickHouse
  const attribution = await getVisitorAttribution(siteId, visitorId);

  // Insert revenue event
  await insertRevenueEvent({
    site_id: siteId,
    visitor_id: visitorId,
    transaction_id: session.id,
    transaction_type: session.mode === "subscription" ? "subscription" : "one_time",
    amount,
    currency,
    is_subscription: session.mode === "subscription",
    subscription_id: session.subscription as string | undefined,
    customer_id: session.customer as string,
    customer_email: customerEmail,
    ...attribution,
  });
}

async function handlePaymentSuccess(siteId: string, paymentIntent: Stripe.PaymentIntent) {
  // Similar to checkout, but for direct payment intents
  console.log(`Payment succeeded: ${paymentIntent.id}`);
}

async function handleSubscription(
  siteId: string,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const mrr = calculateMRR(subscription);
  console.log(`Subscription ${eventType}: ${subscription.id}, MRR: ${mrr}`);
}

async function handleSubscriptionCancelled(siteId: string, subscription: Stripe.Subscription) {
  const mrr = calculateMRR(subscription);
  console.log(`Subscription cancelled: ${subscription.id}, MRR loss: ${mrr}`);
}

async function handleInvoicePaid(siteId: string, invoice: Stripe.Invoice) {
  console.log(`Invoice paid: ${invoice.id}, Amount: ${invoice.amount_paid}`);
}

function calculateMRR(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0];
  if (!item) return 0;

  const amount = item.price.unit_amount || 0;
  const interval = item.price.recurring?.interval;
  const intervalCount = item.price.recurring?.interval_count || 1;

  if (interval === "month") {
    return (amount / 100) / intervalCount;
  } else if (interval === "year") {
    return (amount / 100) / (12 * intervalCount);
  }

  return amount / 100;
}

async function getVisitorAttribution(siteId: string, visitorId: string) {
  try {
    const result = await clickhouse.query({
      query: `
        SELECT
          argMin(utm_source, timestamp) as source,
          argMin(utm_medium, timestamp) as medium,
          argMin(utm_campaign, timestamp) as campaign,
          argMin(channel_group, timestamp) as channel
        FROM events
        WHERE site_id = {site_id:String}
          AND visitor_id = {visitor_id:String}
        GROUP BY visitor_id
      `,
      query_params: { site_id: siteId, visitor_id: visitorId },
      format: "JSONEachRow",
    });

    const rows = await result.json<any[]>();
    return rows[0] || {
      source: "direct",
      medium: "none",
      campaign: "",
      channel: "Direct",
    };
  } catch {
    return {
      source: "direct",
      medium: "none",
      campaign: "",
      channel: "Direct",
    };
  }
}

async function insertRevenueEvent(data: any) {
  await clickhouse.insert({
    table: "revenue_events",
    values: [
      {
        event_id: uuidv4(),
        site_id: data.site_id,
        visitor_id: data.visitor_id,
        session_id: "",
        transaction_id: data.transaction_id,
        transaction_type: data.transaction_type,
        amount: data.amount,
        currency: data.currency,
        amount_usd: data.amount, // TODO: Convert currency
        is_subscription: data.is_subscription ? 1 : 0,
        subscription_id: data.subscription_id || null,
        mrr_change: data.mrr_change || 0,
        product_id: data.product_id || "",
        product_name: data.product_name || "",
        customer_id: data.customer_id,
        customer_email: data.customer_email,
        attributed_source: data.source || "direct",
        attributed_medium: data.medium || "none",
        attributed_campaign: data.campaign || "",
        attributed_channel: data.channel || "Direct",
        attribution_model: "first_touch",
        timestamp: new Date(),
      },
    ],
    format: "JSONEachRow",
  });
}

function decryptSecret(encrypted: Buffer): string {
  // TODO: Implement proper decryption
  // For now, just convert to string (in production, use proper encryption)
  return encrypted.toString("utf-8");
}
