import { notFound } from "next/navigation"
import { getSite } from "@/lib/api/sites"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrackingCodeSnippet } from "@/components/dashboard/tracking-code-snippet"

interface SettingsPageProps {
  params: { siteId: string }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const site = await getSite(params.siteId)

  if (!site) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage settings for {site.name}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tracking Code</CardTitle>
            <CardDescription>
              Add this code to your website to start tracking visitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackingCodeSnippet trackingId={site.trackingId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
            <CardDescription>
              Basic information about your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground">{site.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Domain</label>
              <p className="text-sm text-muted-foreground">{site.domain}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Tracking ID</label>
              <p className="text-sm text-muted-foreground font-mono">{site.trackingId}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm text-muted-foreground">
                {site.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Configure privacy and data collection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Anonymize IPs</p>
                <p className="text-xs text-muted-foreground">
                  IP addresses will not be stored
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {site.anonymizeIps ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Respect Do Not Track</p>
                <p className="text-xs text-muted-foreground">
                  Honor browser DNT settings
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {site.respectDnt ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Data Retention</p>
                <p className="text-xs text-muted-foreground">
                  How long to keep analytics data
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {site.dataRetentionDays} days
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
