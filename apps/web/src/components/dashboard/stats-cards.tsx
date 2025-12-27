import { getStats } from "@/lib/api/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, Clock, TrendingDown, TrendingUp } from "lucide-react"

interface StatsCardsProps {
  siteId: string
  period: string
}

export async function StatsCards({ siteId, period }: StatsCardsProps) {
  const stats = await getStats(siteId, period)

  const cards = [
    {
      title: "Unique Visitors",
      value: stats.metrics.visitors.toLocaleString(),
      icon: Users,
      change: null,
    },
    {
      title: "Pageviews",
      value: stats.metrics.pageviews.toLocaleString(),
      icon: Eye,
      change: null,
    },
    {
      title: "Sessions",
      value: stats.metrics.sessions.toLocaleString(),
      icon: Clock,
      change: null,
    },
    {
      title: "Bounce Rate",
      value: `${stats.metrics.bounce_rate}%`,
      icon: stats.metrics.bounce_rate > 50 ? TrendingDown : TrendingUp,
      change: null,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

StatsCards.Skeleton = function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
