export interface Event {
  name: string
  timestamp: number
  properties: EventProperties
  context: EventContext
}

export interface EventProperties {
  url?: string
  path?: string
  title?: string
  referrer?: string
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  utm_content?: string | null
  [key: string]: unknown
}

export interface EventContext {
  viewport_width: number
  viewport_height: number
  screen_width: number
  screen_height: number
  timezone: string
  language: string
}

export interface CollectPayload {
  events: Event[]
  session: {
    id: string
    is_new: boolean
  }
  visitor: {
    id: string
    is_new: boolean
  }
}

export interface RawEvent {
  event_id?: string
  site_id: string
  visitor_id: string
  session_id: string
  event_name: string
  event_properties?: string
  page_url?: string
  page_path?: string
  page_title?: string
  page_referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  channel_group?: string
  browser?: string
  browser_version?: string
  os?: string
  os_version?: string
  device_type?: string
  screen_width?: number
  screen_height?: number
  viewport_width?: number
  viewport_height?: number
  country_code?: string
  region?: string
  city?: string
  timezone?: string
  language?: string
  timestamp: number
  is_new_visitor: boolean
  is_new_session: boolean
  client_ip?: string
  user_agent?: string
  heatmap_x?: number
  heatmap_y?: number
  scroll_depth?: number
}

export interface Site {
  id: string
  name: string
  domain: string
  trackingId: string
  organizationId: string
  allowedHosts: string[]
  isActive: boolean
  enableHeatmaps: boolean
  enableRecordings: boolean
  anonymizeIps: boolean
  respectDnt: boolean
  cookieConsentMode: string
  dataRetentionDays: number
  createdAt: Date
  updatedAt: Date
}

export interface StatsMetrics {
  visitors: number
  pageviews: number
  sessions: number
  bounce_rate: number
}

export interface TimeseriesPoint {
  date: string
  visitors: number
  pageviews: number
}

export interface StatsResponse {
  period: {
    start: string
    end: string
  }
  metrics: StatsMetrics
  timeseries: TimeseriesPoint[]
}

export interface RealtimeVisitor {
  visitor_id: string
  current_page: string
  country: string
  device: string
  source: string
  pages_viewed: number
  time_on_site: number
}

export interface RealtimeResponse {
  active_visitors: number
  visitors_list: RealtimeVisitor[]
  top_pages: Array<{ path: string; visitors: number }>
  top_sources: Array<{ source: string; visitors: number }>
}

export interface SourceData {
  channel_group: string
  source: string
  medium: string
  visitors: number
  pageviews: number
}

export interface PageData {
  page_path: string
  pageviews: number
  visitors: number
  avg_scroll: number
}

export type Period = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom'
