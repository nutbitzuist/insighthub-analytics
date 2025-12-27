import { getPages } from "@/lib/api/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PagesTableProps {
  siteId: string
  period: string
}

export async function PagesTable({ siteId, period }: PagesTableProps) {
  const { data: pages } = await getPages(siteId, period)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Pages</CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        ) : (
          <div className="space-y-4">
            {pages.slice(0, 10).map((page, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {page.page_path || "/"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-medium">{page.pageviews}</p>
                  <p className="text-xs text-muted-foreground">views</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

PagesTable.Skeleton = function PagesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-24 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="text-right">
                <div className="h-4 w-8 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-10 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
