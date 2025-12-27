"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

interface RealtimeWidgetProps {
  siteId: string
}

export function RealTimeWidget({ siteId }: RealtimeWidgetProps) {
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null)

  useEffect(() => {
    const fetchRealtime = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/stats/${siteId}/realtime`
        )
        if (res.ok) {
          const data = await res.json()
          setActiveVisitors(data.active_visitors)
        }
      } catch (error) {
        console.error("Failed to fetch realtime data:", error)
      }
    }

    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000) // Refresh every 30s

    return () => clearInterval(interval)
  }, [siteId])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
      <Activity className="h-4 w-4 text-green-500 animate-pulse" />
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {activeVisitors !== null ? activeVisitors : "--"} online
      </span>
    </div>
  )
}
