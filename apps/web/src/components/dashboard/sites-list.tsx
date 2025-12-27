import Link from "next/link"
import { getSites } from "@/lib/api/sites"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, ExternalLink, TrendingUp, Users, Eye } from "lucide-react"

export async function SitesList() {
  const sites = await getSites()

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Add your first website to start tracking analytics
          </p>
          <Link
            href="/dashboard/sites/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Website
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sites.map((site) => (
        <Link key={site.id} href={`/dashboard/${site.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{site.name}</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">{site.domain}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>--</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>--</span>
                </div>
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>--</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

SitesList.Skeleton = function SitesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-3 w-32 bg-muted animate-pulse rounded mb-4" />
            <div className="flex items-center gap-4">
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
