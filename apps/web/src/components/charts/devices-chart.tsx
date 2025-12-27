"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Smartphone, Tablet } from "lucide-react"

interface DevicesChartProps {
  siteId: string
  period: string
}

export async function DevicesChart({ siteId, period }: DevicesChartProps) {
  // In a real implementation, this would fetch device data
  const devices = [
    { type: "desktop", visitors: 0, percentage: 0 },
    { type: "mobile", visitors: 0, percentage: 0 },
    { type: "tablet", visitors: 0, percentage: 0 },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "desktop":
        return Monitor
      case "mobile":
        return Smartphone
      case "tablet":
        return Tablet
      default:
        return Monitor
    }
  }

  const total = devices.reduce((sum, d) => sum + d.visitors, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No device data yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => {
              const Icon = getIcon(device.type)
              return (
                <div key={device.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{device.type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {device.visitors.toLocaleString()} ({device.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

DevicesChart.Skeleton = function DevicesChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
