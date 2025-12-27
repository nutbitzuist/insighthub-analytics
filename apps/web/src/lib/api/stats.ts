const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export interface StatsResponse {
  period: { start: string; end: string }
  metrics: {
    visitors: number
    pageviews: number
    sessions: number
    bounce_rate: number
  }
  timeseries: Array<{
    date: string
    visitors: number
    pageviews: number
  }>
}

export interface RealtimeResponse {
  active_visitors: number
  visitors_list: Array<{
    visitor_id: string
    current_page: string
    country: string
    device: string
    source: string
    pages_viewed: number
    time_on_site: number
  }>
  top_pages: Array<{ path: string; visitors: number }>
  top_sources: Array<{ source: string; visitors: number }>
}

export interface SourcesResponse {
  data: Array<{
    channel_group: string
    source: string
    medium: string
    visitors: number
    pageviews: number
  }>
}

export interface PagesResponse {
  data: Array<{
    page_path: string
    pageviews: number
    visitors: number
    avg_scroll: number
  }>
}

export async function getStats(
  siteId: string,
  period: string = "last_7_days"
): Promise<StatsResponse> {
  const res = await fetch(
    `${API_URL}/api/stats/${siteId}?period=${period}`,
    { next: { revalidate: 300 } }
  )

  if (!res.ok) {
    throw new Error("Failed to fetch stats")
  }

  return res.json()
}

export async function getRealtime(siteId: string): Promise<RealtimeResponse> {
  const res = await fetch(`${API_URL}/api/stats/${siteId}/realtime`, {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to fetch realtime data")
  }

  return res.json()
}

export async function getSources(
  siteId: string,
  period: string = "last_7_days"
): Promise<SourcesResponse> {
  const res = await fetch(
    `${API_URL}/api/stats/${siteId}/sources?period=${period}`,
    { next: { revalidate: 300 } }
  )

  if (!res.ok) {
    throw new Error("Failed to fetch sources")
  }

  return res.json()
}

export async function getPages(
  siteId: string,
  period: string = "last_7_days"
): Promise<PagesResponse> {
  const res = await fetch(
    `${API_URL}/api/stats/${siteId}/pages?period=${period}`,
    { next: { revalidate: 300 } }
  )

  if (!res.ok) {
    throw new Error("Failed to fetch pages")
  }

  return res.json()
}
