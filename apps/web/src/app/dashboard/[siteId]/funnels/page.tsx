"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Plus, Trash2, ArrowDown, ChevronRight } from "lucide-react";

interface FunnelStep {
  id: string;
  order: number;
  name: string;
  stepType: string;
  config: any;
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  createdAt: string;
}

interface FunnelData {
  steps: Array<{
    step: number;
    name: string;
    visitors: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
}

export default function FunnelsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFunnel, setNewFunnel] = useState({
    name: "",
    description: "",
    steps: [
      { name: "Step 1", stepType: "pageview", config: { urlPattern: "/" }, isRequired: true },
      { name: "Step 2", stepType: "pageview", config: { urlPattern: "" }, isRequired: true },
    ],
  });

  useEffect(() => {
    fetchFunnels();
  }, [siteId]);

  async function fetchFunnels() {
    try {
      const res = await fetch(`/api/sites/${siteId}/funnels`);
      const data = await res.json();
      setFunnels(data.funnels || []);
      if (data.funnels?.length > 0) {
        selectFunnel(data.funnels[0]);
      }
    } catch (error) {
      console.error("Failed to fetch funnels:", error);
    } finally {
      setLoading(false);
    }
  }

  async function selectFunnel(funnel: Funnel) {
    setSelectedFunnel(funnel);
    try {
      const res = await fetch(`/api/sites/${siteId}/funnels/${funnel.id}`);
      const data = await res.json();
      setFunnelData(data.data);
    } catch (error) {
      console.error("Failed to fetch funnel data:", error);
    }
  }

  async function createFunnel() {
    try {
      const res = await fetch(`/api/sites/${siteId}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFunnel),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewFunnel({
          name: "",
          description: "",
          steps: [
            { name: "Step 1", stepType: "pageview", config: { urlPattern: "/" }, isRequired: true },
            { name: "Step 2", stepType: "pageview", config: { urlPattern: "" }, isRequired: true },
          ],
        });
        fetchFunnels();
      }
    } catch (error) {
      console.error("Failed to create funnel:", error);
    }
  }

  async function deleteFunnel(funnelId: string) {
    if (!confirm("Are you sure you want to delete this funnel?")) return;
    try {
      await fetch(`/api/sites/${siteId}/funnels/${funnelId}`, { method: "DELETE" });
      setSelectedFunnel(null);
      setFunnelData(null);
      fetchFunnels();
    } catch (error) {
      console.error("Failed to delete funnel:", error);
    }
  }

  function addStep() {
    setNewFunnel({
      ...newFunnel,
      steps: [
        ...newFunnel.steps,
        {
          name: `Step ${newFunnel.steps.length + 1}`,
          stepType: "pageview",
          config: { urlPattern: "" },
          isRequired: true,
        },
      ],
    });
  }

  function removeStep(index: number) {
    if (newFunnel.steps.length <= 2) return;
    setNewFunnel({
      ...newFunnel,
      steps: newFunnel.steps.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funnels</h1>
          <p className="text-muted-foreground">Analyze user journeys and conversion paths</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Funnel
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Funnel</CardTitle>
            <CardDescription>Define the steps users take to convert</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Funnel Name</Label>
                <Input
                  placeholder="e.g., Checkout Flow"
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Describe this funnel"
                  value={newFunnel.description}
                  onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Funnel Steps</Label>
              {newFunnel.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <Input
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) => {
                      const steps = [...newFunnel.steps];
                      steps[index].name = e.target.value;
                      setNewFunnel({ ...newFunnel, steps });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL pattern (e.g., /checkout)"
                    value={step.config.urlPattern}
                    onChange={(e) => {
                      const steps = [...newFunnel.steps];
                      steps[index].config.urlPattern = e.target.value;
                      setNewFunnel({ ...newFunnel, steps });
                    }}
                    className="flex-1"
                  />
                  {newFunnel.steps.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={createFunnel} disabled={!newFunnel.name}>
                Create Funnel
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Your Funnels
          </h3>
          {funnels.length === 0 ? (
            <Card className="p-6 text-center">
              <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No funnels yet</p>
            </Card>
          ) : (
            funnels.map((funnel) => (
              <Card
                key={funnel.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedFunnel?.id === funnel.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => selectFunnel(funnel)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{funnel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {funnel.steps.length} steps
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {selectedFunnel && funnelData ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedFunnel.name}</CardTitle>
                    <CardDescription>
                      Overall conversion: {funnelData.overallConversionRate.toFixed(1)}%
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteFunnel(selectedFunnel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.steps.map((step, index) => (
                    <div key={step.step}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{step.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {step.visitors.toLocaleString()} visitors
                            </span>
                          </div>
                          <div className="h-8 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${step.conversionRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right w-20">
                          <p className="font-bold">{step.conversionRate.toFixed(1)}%</p>
                          {step.dropoffRate > 0 && (
                            <p className="text-xs text-red-500">
                              -{step.dropoffRate.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                      {index < funnelData.steps.length - 1 && (
                        <div className="flex justify-center py-2">
                          <ArrowDown className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a funnel</h3>
              <p className="text-muted-foreground">
                Choose a funnel from the list to view its conversion data
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
