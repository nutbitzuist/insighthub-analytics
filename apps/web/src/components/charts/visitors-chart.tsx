"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getStats } from "@/lib/api/stats"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface VisitorsChartProps {
  siteId: string
  period: string
}

export async function VisitorsChart({ siteId, period }: VisitorsChartProps) {
  const stats = await getStats(siteId, period)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors & Pageviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.timeseries}>
              <defs>
                <linearGradient id="visitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(label).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="capitalize">{entry.dataKey}:</span>
                          <span className="font-medium">{entry.value?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--primary))"
                fill="url(#visitors)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="hsl(var(--secondary))"
                fill="url(#pageviews)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

VisitorsChart.Skeleton = function VisitorsChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-muted/50 animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}
