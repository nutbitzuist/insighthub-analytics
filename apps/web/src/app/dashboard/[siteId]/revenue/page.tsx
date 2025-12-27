"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, RefreshCw, Users } from "lucide-react";

interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  refunds: number;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  transactionCount: number;
  avgOrderValue: number;
}

interface RevenueAttribution {
  source: string;
  medium: string;
  campaign: string;
  revenue: number;
  conversions: number;
}

interface MrrData {
  mrr: number;
  subscriptionCount: number;
  avgSubscriptionValue: number;
}

export default function RevenuePage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [attribution, setAttribution] = useState<RevenueAttribution[]>([]);
  const [mrrData, setMrrData] = useState<MrrData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [siteId]);

  async function fetchRevenueData() {
    try {
      const [revenueRes, attrRes, mrrRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/revenue`),
        fetch(`/api/sites/${siteId}/revenue/attribution`),
        fetch(`/api/sites/${siteId}/revenue/mrr`),
      ]);

      const [revenueData, attrData, mrrDataRes] = await Promise.all([
        revenueRes.json(),
        attrRes.json(),
        mrrRes.json(),
      ]);

      setMetrics(revenueData.metrics);
      setAttribution(attrData.attribution || []);
      setMrrData(mrrDataRes);
    } catch (error) {
      console.error("Failed to fetch revenue data:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-muted-foreground">Track revenue and attribution from Stripe</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.netRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">After refunds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <RefreshCw className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mrrData?.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {mrrData?.subscriptionCount || 0} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.avgOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.transactionCount || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>One-time vs recurring revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Subscription Revenue</span>
                </div>
                <span className="font-bold">
                  {formatCurrency(metrics?.subscriptionRevenue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>One-time Revenue</span>
                </div>
                <span className="font-bold">
                  {formatCurrency(metrics?.oneTimeRevenue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Refunds</span>
                </div>
                <span className="font-bold text-red-500">
                  -{formatCurrency(metrics?.refunds || 0)}
                </span>
              </div>
            </div>

            <div className="mt-6 h-4 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500"
                style={{
                  width: `${
                    metrics?.totalRevenue
                      ? ((metrics.subscriptionRevenue || 0) / metrics.totalRevenue) * 100
                      : 0
                  }%`,
                }}
              />
              <div
                className="bg-green-500"
                style={{
                  width: `${
                    metrics?.totalRevenue
                      ? ((metrics.oneTimeRevenue || 0) / metrics.totalRevenue) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Attribution</CardTitle>
            <CardDescription>Revenue by traffic source</CardDescription>
          </CardHeader>
          <CardContent>
            {attribution.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No attribution data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attribution.slice(0, 5).map((attr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{attr.source || "Direct"}</p>
                      <p className="text-sm text-muted-foreground">
                        {attr.medium || "none"} • {attr.conversions} conversions
                      </p>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(attr.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Integration</CardTitle>
          <CardDescription>Connect your Stripe account to track revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Webhook Endpoint</h4>
            <code className="text-sm bg-background p-2 rounded block">
              {`${process.env.NEXT_PUBLIC_API_URL || "https://api.insighthub.io"}/webhooks/stripe`}
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              Add this webhook URL in your Stripe dashboard to receive payment events.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
