"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check, Zap, Building2, Rocket, ExternalLink } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  limits: {
    sites: number;
    eventsPerMonth: number;
    teamMembers: number;
    dataRetentionDays: number;
    features: string[];
  };
}

interface Subscription {
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

interface Usage {
  sites: number;
  eventsThisMonth: number;
  teamMembers: number;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  invoiceUrl?: string;
}

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const orgId = "current-org-id"; // Would come from auth context

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    try {
      const [billingRes, plansRes, invoicesRes] = await Promise.all([
        fetch(`/api/organizations/${orgId}/billing`),
        fetch("/api/billing/plans"),
        fetch(`/api/organizations/${orgId}/billing/invoices`),
      ]);
      const [billingData, plansData, invoicesData] = await Promise.all([
        billingRes.json(),
        plansRes.json(),
        invoicesRes.json(),
      ]);
      setCurrentPlan(billingData.plan);
      setSubscription(billingData.subscription);
      setUsage(billingData.usage);
      setPlans(plansData.plans || []);
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function upgradePlan(planId: string) {
    try {
      const res = await fetch(`/api/organizations/${orgId}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
    }
  }

  async function openPortal() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (error) {
      console.error("Failed to open portal:", error);
    }
  }

  function formatCurrency(amount: number, currency: string = "usd"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-6 w-6" />,
    starter: <Rocket className="h-6 w-6" />,
    pro: <Building2 className="h-6 w-6" />,
    enterprise: <Building2 className="h-6 w-6" />,
  };

  const planPrices: Record<string, string> = {
    free: "$0",
    starter: "$29",
    pro: "$99",
    enterprise: "Custom",
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            {subscription?.cancelAtPeriodEnd
              ? "Your subscription will cancel at the end of the billing period"
              : "Your current subscription details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                {planIcons[currentPlan?.id || "free"]}
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentPlan?.name || "Free"} Plan</h3>
                <p className="text-muted-foreground">
                  {subscription?.currentPeriodEnd
                    ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : "No active subscription"}
                </p>
              </div>
            </div>
            {subscription && (
              <Button variant="outline" onClick={openPortal}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>

          {usage && (
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Sites</p>
                <p className="text-2xl font-bold">
                  {usage.sites} / {currentPlan?.limits.sites === -1 ? "∞" : currentPlan?.limits.sites}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Events This Month</p>
                <p className="text-2xl font-bold">
                  {usage.eventsThisMonth.toLocaleString()} /{" "}
                  {currentPlan?.limits.eventsPerMonth === -1
                    ? "∞"
                    : currentPlan?.limits.eventsPerMonth.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">
                  {usage.teamMembers} /{" "}
                  {currentPlan?.limits.teamMembers === -1 ? "∞" : currentPlan?.limits.teamMembers}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-bold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.id === currentPlan?.id ? "border-primary" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-muted rounded-lg">{planIcons[plan.id]}</div>
                  {plan.id === currentPlan?.id && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {planPrices[plan.id]}
                  {plan.id !== "free" && plan.id !== "enterprise" && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.limits.sites === -1 ? "Unlimited" : plan.limits.sites} sites
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.limits.eventsPerMonth === -1
                      ? "Unlimited"
                      : `${(plan.limits.eventsPerMonth / 1000).toFixed(0)}K`}{" "}
                    events/mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.limits.teamMembers === -1 ? "Unlimited" : plan.limits.teamMembers} team
                    members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.limits.dataRetentionDays === -1
                      ? "Forever"
                      : `${plan.limits.dataRetentionDays} days`}{" "}
                    retention
                  </li>
                </ul>
                {plan.id !== currentPlan?.id && plan.id !== "free" && (
                  <Button
                    className="w-full mt-4"
                    variant={plan.id === "enterprise" ? "outline" : "default"}
                    onClick={() =>
                      plan.id === "enterprise"
                        ? (window.location.href = "mailto:sales@insighthub.io")
                        : upgradePlan(plan.id)
                    }
                  >
                    {plan.id === "enterprise" ? "Contact Sales" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Invoice #{invoice.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.paidAt
                        ? `Paid on ${new Date(invoice.paidAt).toLocaleDateString()}`
                        : invoice.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                    {invoice.invoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
