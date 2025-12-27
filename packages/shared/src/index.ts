// ==========================================
// Event Types
// ==========================================

export interface RawEvent {
  name: string;
  timestamp: number;
  properties?: Record<string, any>;
  context?: EventContext;
}

export interface EventContext {
  viewport_width?: number;
  viewport_height?: number;
  screen_width?: number;
  screen_height?: number;
  timezone?: string;
  language?: string;
}

export interface EnrichedEvent {
  event_id: string;
  site_id: string;
  visitor_id: string;
  session_id: string;

  event_name: string;
  event_properties: string; // JSON stringified

  page_url: string;
  page_path: string;
  page_title: string;
  page_referrer: string;

  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  channel_group: string;

  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  device_type: string;

  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;

  country_code: string;
  region: string;
  city: string;
  timezone: string;
  language: string;

  timestamp: Date;
  is_new_visitor: number;
  is_new_session: number;

  heatmap_x: number | null;
  heatmap_y: number | null;
  scroll_depth: number | null;
}

// ==========================================
// API Types
// ==========================================

export interface CollectRequest {
  events: RawEvent[];
  session: {
    id: string;
    is_new?: boolean;
  };
  visitor: {
    id: string;
    is_new?: boolean;
  };
}

export interface StatsResponse {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    visitors: MetricValue;
    pageviews: MetricValue;
    sessions: MetricValue;
    bounce_rate: MetricValue;
    avg_duration: MetricValue;
    revenue?: MetricValue;
  };
  timeseries: TimeseriesPoint[];
}

export interface MetricValue {
  value: number;
  change: number; // Percentage change from previous period
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions?: number;
  revenue?: number;
}

// ==========================================
// Dashboard Types
// ==========================================

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  trackingId: string;
  isActive: boolean;
  enableHeatmaps: boolean;
  enableRecordings: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  plan: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface Goal {
  id: string;
  siteId: string;
  name: string;
  description?: string;
  goalType: "destination" | "event" | "duration" | "pages";
  config: GoalConfig;
  isActive: boolean;
}

export type GoalConfig =
  | DestinationGoalConfig
  | EventGoalConfig
  | DurationGoalConfig
  | PagesGoalConfig;

export interface DestinationGoalConfig {
  match_type: "exact" | "contains" | "regex";
  pattern: string;
}

export interface EventGoalConfig {
  event_name: string;
  properties?: Record<string, any>;
}

export interface DurationGoalConfig {
  operator: "gte" | "lte";
  seconds: number;
}

export interface PagesGoalConfig {
  operator: "gte" | "lte";
  count: number;
}

export interface Funnel {
  id: string;
  siteId: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
}

export interface FunnelStep {
  id: string;
  order: number;
  name: string;
  stepType: "pageview" | "event";
  config: {
    url_pattern?: string;
    event_name?: string;
    event_properties?: Record<string, any>;
  };
  isRequired: boolean;
}

export interface Alert {
  id: string;
  siteId: string;
  name: string;
  metric: string;
  condition: "above" | "below" | "change_percent";
  threshold: number;
  comparisonPeriod: string;
  notifyChannels: string[];
  isActive: boolean;
}

export interface Annotation {
  id: string;
  siteId: string;
  date: Date;
  title: string;
  description?: string;
  category: string;
}

// ==========================================
// Revenue Types
// ==========================================

export interface RevenueEvent {
  event_id: string;
  site_id: string;
  visitor_id: string;
  transaction_id: string;
  transaction_type: "one_time" | "subscription" | "refund";
  amount: number;
  currency: string;
  amount_usd: number;
  is_subscription: boolean;
  subscription_id?: string;
  mrr_change: number;
  product_id: string;
  product_name: string;
  customer_id: string;
  customer_email: string;
  attributed_source: string;
  attributed_medium: string;
  attributed_campaign: string;
  attributed_channel: string;
  attribution_model: string;
  timestamp: Date;
}

// ==========================================
// Heatmap Types
// ==========================================

export interface HeatmapData {
  page_url: string;
  screenshot_url?: string;
  viewport: {
    width: number;
    height: number;
  };
  clicks: HeatmapPoint[];
  scroll: ScrollDepthData[];
}

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export interface ScrollDepthData {
  depth: number;
  percentage: number;
}

// ==========================================
// Real-time Types
// ==========================================

export interface RealtimeData {
  active_visitors: number;
  visitors_list: RealtimeVisitor[];
  top_pages: { path: string; visitors: number }[];
  top_sources: { source: string; visitors: number }[];
}

export interface RealtimeVisitor {
  visitor_id: string;
  current_page: string;
  country: string;
  device: string;
  source: string;
  pages_viewed: number;
  time_on_site: number;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
