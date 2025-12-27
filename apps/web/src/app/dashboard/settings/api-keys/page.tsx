"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plus, Trash2, Copy, RefreshCw, Eye, EyeOff, Check } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  rateLimit: number;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState({
    name: "",
    scopes: ["read:stats"] as string[],
    rateLimit: 1000,
  });
  const orgId = "current-org-id"; // Would come from auth context

  const availableScopes = [
    { id: "read:stats", label: "Read Stats", description: "View analytics data" },
    { id: "read:events", label: "Read Events", description: "View event data" },
    { id: "write:events", label: "Write Events", description: "Track custom events" },
    { id: "read:goals", label: "Read Goals", description: "View goals" },
    { id: "write:goals", label: "Write Goals", description: "Create/update goals" },
    { id: "read:funnels", label: "Read Funnels", description: "View funnels" },
    { id: "write:funnels", label: "Write Funnels", description: "Create/update funnels" },
    { id: "read:heatmaps", label: "Read Heatmaps", description: "View heatmap data" },
    { id: "admin", label: "Admin", description: "Full access to all resources" },
  ];

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/api-keys`);
      const data = await res.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKey),
      });
      const data = await res.json();
      if (data.apiKey?.key) {
        setNewKeyValue(data.apiKey.key);
        setNewKey({ name: "", scopes: ["read:stats"], rateLimit: 1000 });
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  }

  async function deleteApiKey(keyId: string) {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      await fetch(`/api/organizations/${orgId}/api-keys/${keyId}`, { method: "DELETE" });
      fetchApiKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  }

  async function rotateApiKey(keyId: string) {
    if (!confirm("This will invalidate the current key. Continue?")) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/api-keys/${keyId}/rotate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.key) {
        setNewKeyValue(data.key);
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
    }
  }

  function toggleScope(scope: string) {
    const scopes = newKey.scopes.includes(scope)
      ? newKey.scopes.filter((s) => s !== scope)
      : [...newKey.scopes, scope];
    setNewKey({ ...newKey, scopes });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for programmatic access</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {newKeyValue && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">
              API Key Created Successfully
            </CardTitle>
            <CardDescription>
              Copy this key now. You won't be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-background rounded font-mono text-sm break-all">
                {newKeyValue}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(newKeyValue)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewKeyValue(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>Generate a new key for API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g., Production API Key"
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newKey.scopes.includes(scope.id)
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newKey.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{scope.label}</p>
                      <p className="text-sm text-muted-foreground">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rate Limit (requests/hour)</Label>
              <Input
                type="number"
                value={newKey.rateLimit}
                onChange={(e) => setNewKey({ ...newKey, rateLimit: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createApiKey} disabled={!newKey.name || newKey.scopes.length === 0}>
                Create Key
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {apiKeys.length === 0 ? (
        <Card className="p-12 text-center">
          <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
          <p className="text-muted-foreground mb-4">
            Create an API key to access InsightHub programmatically
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {key.keyPrefix}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rotateApiKey(key.id)}
                      title="Rotate key"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-1 bg-muted rounded text-xs font-mono"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {key.lastUsedAt
                    ? `Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : "Never used"}{" "}
                  • Rate limit: {key.rateLimit}/hr
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Use your API key to authenticate requests to the InsightHub API.
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`curl -X GET "https://api.insighthub.io/v1/sites/{siteId}/stats" \\
  -H "Authorization: Bearer ih_your_api_key_here" \\
  -H "Content-Type: application/json"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
