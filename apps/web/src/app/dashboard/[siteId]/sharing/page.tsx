"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Link, Lock, Globe, Copy, Check, RefreshCw, Code } from "lucide-react";

interface SharingSettings {
  isPublic: boolean;
  shareUrl?: string;
  customSlug?: string;
  hasPassword: boolean;
  expiresAt?: string;
  allowedMetrics?: string[];
}

export default function SharingPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [settings, setSettings] = useState<SharingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    isPublic: false,
    customSlug: "",
    password: "",
  });

  useEffect(() => {
    fetchSharingSettings();
  }, [siteId]);

  async function fetchSharingSettings() {
    try {
      const res = await fetch(`/api/sites/${siteId}/sharing`);
      const data = await res.json();
      setSettings(data);
      setFormData({
        isPublic: data.isPublic || false,
        customSlug: data.customSlug || "",
        password: "",
      });
    } catch (error) {
      console.error("Failed to fetch sharing settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/sharing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: formData.isPublic,
          customSlug: formData.customSlug || undefined,
          password: formData.password || undefined,
        }),
      });
      const data = await res.json();
      setSettings(data);
      setFormData({ ...formData, password: "" });
    } catch (error) {
      console.error("Failed to save sharing settings:", error);
    } finally {
      setSaving(false);
    }
  }

  async function regenerateLink() {
    try {
      const res = await fetch(`/api/sites/${siteId}/sharing/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      setSettings({ ...settings!, shareUrl: data.shareUrl });
    } catch (error) {
      console.error("Failed to regenerate link:", error);
    }
  }

  async function getEmbedCode() {
    try {
      const res = await fetch(`/api/sites/${siteId}/sharing/embed`);
      const data = await res.json();
      setEmbedCode(data.embedCode);
    } catch (error) {
      console.error("Failed to get embed code:", error);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Public Sharing</h1>
        <p className="text-muted-foreground">Share your dashboard publicly or embed it</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share Dashboard</CardTitle>
          <CardDescription>
            Make your analytics dashboard publicly accessible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.isPublic ? (
                <Globe className="h-5 w-5 text-green-500" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {formData.isPublic ? "Public" : "Private"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formData.isPublic
                    ? "Anyone with the link can view"
                    : "Only team members can access"}
                </p>
              </div>
            </div>
            <Button
              variant={formData.isPublic ? "destructive" : "default"}
              onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
            >
              {formData.isPublic ? "Make Private" : "Make Public"}
            </Button>
          </div>

          {formData.isPublic && (
            <>
              <div className="space-y-2">
                <Label>Custom URL Slug (optional)</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center">
                    <span className="px-3 py-2 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                      {baseUrl}/share/
                    </span>
                    <Input
                      placeholder="my-dashboard"
                      value={formData.customSlug}
                      onChange={(e) =>
                        setFormData({ ...formData, customSlug: e.target.value })
                      }
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password Protection (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty for no password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {settings?.hasPassword && !formData.password && (
                  <p className="text-sm text-muted-foreground">
                    Password is currently set. Enter a new one to change it.
                  </p>
                )}
              </div>
            </>
          )}

          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {settings?.isPublic && settings.shareUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Share Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${baseUrl}${settings.shareUrl}`}
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(`${baseUrl}${settings.shareUrl}`)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={regenerateLink}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href={settings.shareUrl} target="_blank" rel="noopener noreferrer">
                  <Link className="h-4 w-4 mr-2" />
                  Open Dashboard
                </a>
              </Button>
              <Button variant="outline" onClick={getEmbedCode}>
                <Code className="h-4 w-4 mr-2" />
                Get Embed Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {embedCode && (
        <Card>
          <CardHeader>
            <CardTitle>Embed Code</CardTitle>
            <CardDescription>
              Add this code to your website to embed the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                {embedCode}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(embedCode)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
