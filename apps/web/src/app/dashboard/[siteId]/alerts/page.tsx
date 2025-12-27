"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Plus, Trash2, Mail, MessageSquare, Webhook, Check, X } from "lucide-react";

interface Alert {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  comparisonPeriod: string;
  notifyChannels: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export default function AlertsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    metric: "visitors",
    condition: "below",
    threshold: 100,
    comparisonPeriod: "day",
    notifyChannels: ["email"] as string[],
  });

  useEffect(() => {
    fetchAlerts();
  }, [siteId]);

  async function fetchAlerts() {
    try {
      const res = await fetch(`/api/sites/${siteId}/alerts`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createAlert() {
    try {
      const res = await fetch(`/api/sites/${siteId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlert),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewAlert({
          name: "",
          metric: "visitors",
          condition: "below",
          threshold: 100,
          comparisonPeriod: "day",
          notifyChannels: ["email"],
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error("Failed to create alert:", error);
    }
  }

  async function deleteAlert(alertId: string) {
    if (!confirm("Are you sure you want to delete this alert?")) return;
    try {
      await fetch(`/api/sites/${siteId}/alerts/${alertId}`, { method: "DELETE" });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  }

  async function toggleAlert(alertId: string, isActive: boolean) {
    try {
      await fetch(`/api/sites/${siteId}/alerts/${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to toggle alert:", error);
    }
  }

  function toggleChannel(channel: string) {
    const channels = newAlert.notifyChannels.includes(channel)
      ? newAlert.notifyChannels.filter((c) => c !== channel)
      : [...newAlert.notifyChannels, channel];
    setNewAlert({ ...newAlert, notifyChannels: channels });
  }

  const metricLabels: Record<string, string> = {
    visitors: "Visitors",
    pageviews: "Pageviews",
    bounce_rate: "Bounce Rate",
    avg_duration: "Avg. Duration",
    conversions: "Conversions",
    revenue: "Revenue",
  };

  const conditionLabels: Record<string, string> = {
    above: "goes above",
    below: "drops below",
    change_percent: "changes by",
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Get notified when metrics change</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Alert</CardTitle>
            <CardDescription>Set up notifications for metric changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alert Name</Label>
              <Input
                placeholder="e.g., Traffic Drop Alert"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Metric</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newAlert.metric}
                  onChange={(e) => setNewAlert({ ...newAlert, metric: e.target.value })}
                >
                  <option value="visitors">Visitors</option>
                  <option value="pageviews">Pageviews</option>
                  <option value="bounce_rate">Bounce Rate</option>
                  <option value="avg_duration">Avg. Duration</option>
                  <option value="conversions">Conversions</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newAlert.condition}
                  onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                >
                  <option value="above">Goes above</option>
                  <option value="below">Drops below</option>
                  <option value="change_percent">Changes by %</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Threshold</Label>
                <Input
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newAlert.notifyChannels.includes("email") ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel("email")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={newAlert.notifyChannels.includes("slack") ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel("slack")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Slack
                </Button>
                <Button
                  type="button"
                  variant={newAlert.notifyChannels.includes("webhook") ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel("webhook")}
                >
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhook
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createAlert} disabled={!newAlert.name}>
                Create Alert
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
          <p className="text-muted-foreground mb-4">
            Create alerts to get notified when your metrics change
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className={`h-5 w-5 ${alert.isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <CardTitle className="text-lg">{alert.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleAlert(alert.id, alert.isActive)}
                    >
                      {alert.isActive ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Alert when <strong>{metricLabels[alert.metric]}</strong>{" "}
                  {conditionLabels[alert.condition]} <strong>{alert.threshold}</strong>
                </p>
                <div className="flex items-center gap-2">
                  {alert.notifyChannels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted"
                    >
                      {channel === "email" && <Mail className="h-3 w-3 mr-1" />}
                      {channel === "slack" && <MessageSquare className="h-3 w-3 mr-1" />}
                      {channel === "webhook" && <Webhook className="h-3 w-3 mr-1" />}
                      {channel}
                    </span>
                  ))}
                </div>
                {alert.lastTriggeredAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last triggered: {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
