"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus, Trash2, TrendingUp, Percent } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  description?: string;
  goalType: string;
  config: any;
  isActive: boolean;
  createdAt: string;
}

interface GoalStats {
  totalConversions: number;
  conversionRate: number;
}

export default function GoalsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState<{
    name: string;
    description: string;
    goalType: string;
    config: Record<string, string>;
  }>({
    name: "",
    description: "",
    goalType: "destination",
    config: { matchType: "contains", pattern: "" },
  });

  useEffect(() => {
    fetchGoals();
  }, [siteId]);

  async function fetchGoals() {
    try {
      const res = await fetch(`/api/sites/${siteId}/goals`);
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createGoal() {
    try {
      const res = await fetch(`/api/sites/${siteId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGoal),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewGoal({
          name: "",
          description: "",
          goalType: "destination",
          config: { matchType: "contains", pattern: "" },
        });
        fetchGoals();
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  }

  async function deleteGoal(goalId: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await fetch(`/api/sites/${siteId}/goals/${goalId}`, { method: "DELETE" });
      fetchGoals();
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Track conversions and measure success</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
            <CardDescription>Define what success looks like for your site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sign Up Completed"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Goal Type</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newGoal.goalType}
                  onChange={(e) => setNewGoal({ ...newGoal, goalType: e.target.value })}
                >
                  <option value="destination">Destination (URL)</option>
                  <option value="event">Event</option>
                  <option value="duration">Time on Site</option>
                  <option value="pages">Pages per Session</option>
                </select>
              </div>
            </div>

            {newGoal.goalType === "destination" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newGoal.config.matchType}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        config: { ...newGoal.config, matchType: e.target.value },
                      })
                    }
                  >
                    <option value="exact">Exact Match</option>
                    <option value="contains">Contains</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>URL Pattern</Label>
                  <Input
                    placeholder="/thank-you"
                    value={newGoal.config.pattern}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        config: { ...newGoal.config, pattern: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {newGoal.goalType === "event" && (
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input
                  placeholder="purchase_completed"
                  value={newGoal.config.eventName || ""}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      config: { ...newGoal.config, eventName: e.target.value },
                    })
                  }
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={createGoal} disabled={!newGoal.name}>
                Create Goal
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first goal to start tracking conversions
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Goal
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="capitalize">{goal.goalType} goal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-2xl font-bold">--</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Conv. Rate</p>
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4 text-blue-500" />
                      <span className="text-2xl font-bold">--%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
