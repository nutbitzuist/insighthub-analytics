import { getSources } from "@/lib/api/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SourcesTableProps {
  siteId: string
  period: string
}

export async function SourcesTable({ siteId, period }: SourcesTableProps) {
  const { data: sources } = await getSources(siteId, period)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        ) : (
          <div className="space-y-4">
            {sources.slice(0, 10).map((source, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {source.source || "Direct"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {source.channel_group || "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{source.visitors}</p>
                  <p className="text-xs text-muted-foreground">visitors</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

SourcesTable.Skeleton = function SourcesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-8 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-12 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
