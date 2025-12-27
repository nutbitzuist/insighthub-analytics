# Product Requirements Document (PRD)

## InsightHub Analytics Platform

**Version:** 1.0  
**Date:** December 27, 2025  
**Author:** Claude AI  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users & Use Cases](#3-target-users--use-cases)
4. [Feature Specifications](#4-feature-specifications)
5. [Technical Architecture](#5-technical-architecture)
6. [Database Design](#6-database-design)
7. [API Specifications](#7-api-specifications)
8. [Tracking Script Specifications](#8-tracking-script-specifications)
9. [Multi-Tenancy & White-Label Architecture](#9-multi-tenancy--white-label-architecture)
10. [Security & Privacy](#10-security--privacy)
11. [Development Phases](#11-development-phases)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Monetization Strategy](#13-monetization-strategy)
14. [Success Metrics](#14-success-metrics)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### 1.1 Problem Statement

Modern website owners, especially indie hackers and vibe coders, need analytics that:
- Are simple to understand (unlike Google Analytics 4's complexity)
- Focus on revenue attribution (what DataFast does well)
- Include behavioral insights like heatmaps and scroll tracking (what DataFast lacks)
- Can be self-hosted or white-labeled for resale
- Don't require a PhD to set up

### 1.2 Solution

**InsightHub** is a comprehensive, privacy-first analytics platform that combines:
- DataFast's simplicity and revenue-first approach
- Google Analytics' powerful event and UTM tracking
- Hotjar-style heatmaps and behavioral analytics
- Multi-tenant architecture ready for SaaS resale

### 1.3 Key Differentiators

| Feature | Google Analytics | DataFast | InsightHub |
|---------|-----------------|----------|------------|
| Simplicity | ❌ Complex | ✅ Simple | ✅ Simple |
| Revenue Attribution | ⚠️ Manual setup | ✅ Native | ✅ Native |
| Heatmaps | ❌ No | ❌ No | ✅ Yes |
| Scroll Depth | ⚠️ Manual | ❌ No | ✅ Yes |
| Session Recording | ❌ No | ❌ No | ✅ Phase 2 |
| Self-Hosted Option | ❌ No | ❌ No | ✅ Yes |
| White-Label/Resale | ❌ No | ❌ No | ✅ Yes |
| Lightweight Script | ⚠️ 45KB | ✅ 4KB | ✅ <5KB |
| GDPR Compliant | ⚠️ Questionable | ✅ Yes | ✅ Yes |

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

"The only analytics platform you need - from pageviews to payments, clicks to conversions."

### 2.2 Business Goals

| Goal | Target | Timeline |
|------|--------|----------|
| Personal Use | 10 websites tracked | Month 1 |
| Beta Launch | 50 beta users | Month 3 |
| Public Launch | 500 paying customers | Month 6 |
| Scale | 1000+ customers, 10K+ websites | Year 1 |

### 2.3 Product Goals

1. **Ease of Setup**: < 2 minutes from signup to seeing first data
2. **Performance**: < 5KB tracking script, < 100ms load impact
3. **Reliability**: 99.9% uptime for tracking ingestion
4. **Data Freshness**: Near real-time (< 5 minute delay for dashboard)
5. **Scalability**: Handle 100M+ events/month across all tenants

---

## 3. Target Users & Use Cases

### 3.1 Primary Personas

#### Persona 1: Indie Hacker (Primary - You!)
- **Profile**: Solo developer with 5-15 side projects
- **Needs**: Simple dashboard, revenue tracking, quick setup
- **Pain Points**: GA4 is overkill, multiple tools are expensive
- **Value Prop**: One tool for all analytics needs

#### Persona 2: Small Agency
- **Profile**: 2-10 person web agency managing client sites
- **Needs**: White-label solution, client dashboards, team access
- **Pain Points**: Can't afford enterprise tools, clients want branded reports
- **Value Prop**: Resell analytics as a service

#### Persona 3: SaaS Founder
- **Profile**: Building a product, needs to understand user behavior
- **Needs**: Funnel analysis, revenue attribution, custom events
- **Pain Points**: Complex setup, no revenue correlation
- **Value Prop**: See which features drive revenue

### 3.2 Use Cases

| Use Case | User Story | Priority |
|----------|-----------|----------|
| UC-01 | As a website owner, I want to see how many visitors I have today | P0 |
| UC-02 | As a marketer, I want to know which traffic source generates the most revenue | P0 |
| UC-03 | As a designer, I want to see where users click on my landing page | P1 |
| UC-04 | As a founder, I want to track signups through my funnel | P0 |
| UC-05 | As an agency, I want to give clients their own branded dashboard | P1 |
| UC-06 | As a developer, I want to access analytics data via API | P1 |
| UC-07 | As a site owner, I want alerts when traffic drops significantly | P2 |

---

## 4. Feature Specifications

### 4.1 Core Web Analytics (Phase 1)

#### 4.1.1 Visitor Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Unique Visitors | Distinct visitors by fingerprint/cookie | Count distinct visitor_id per period |
| Total Pageviews | All page loads | Count all page_view events |
| Sessions | Visitor session (30 min inactivity = new session) | Group by visitor + 30 min gap |
| Bounce Rate | Single-page sessions / total sessions | Sessions with 1 pageview / total |
| Avg. Session Duration | Time from first to last event in session | Avg(last_event - first_event) |
| Pages per Session | Pageviews / Sessions | Total pageviews / total sessions |
| New vs Returning | First-time vs repeat visitors | Check if visitor_id seen before |

#### 4.1.2 Traffic Sources

| Dimension | Description | Data Source |
|-----------|-------------|-------------|
| Referrer | Full referring URL | document.referrer |
| Referrer Domain | Cleaned domain only | Parse referrer |
| Source | Traffic source (google, facebook, direct) | UTM or inferred |
| Medium | Traffic medium (organic, cpc, email) | UTM or inferred |
| Campaign | Marketing campaign name | utm_campaign |
| Term | Paid search keyword | utm_term |
| Content | Ad/link variant | utm_content |
| Channel Group | Auto-categorization (Organic, Paid, Social, etc.) | Rules engine |

**Channel Group Rules:**
```javascript
const channelRules = {
  'Organic Search': source.includes('google|bing|yahoo') && medium === 'organic',
  'Paid Search': medium === 'cpc' || medium === 'ppc',
  'Social': source.includes('facebook|twitter|linkedin|instagram'),
  'Email': medium === 'email',
  'Referral': medium === 'referral' || hasReferrer,
  'Direct': !hasReferrer && !hasUtm,
  'Other': true // fallback
};
```

#### 4.1.3 Geographic Data

| Dimension | Source | Privacy Note |
|-----------|--------|--------------|
| Country | IP geolocation | Stored, IP discarded |
| Region/State | IP geolocation | Stored, IP discarded |
| City | IP geolocation | Stored, IP discarded |
| Timezone | Client JS | Stored |
| Language | navigator.language | Stored |

#### 4.1.4 Technology Data

| Dimension | Source |
|-----------|--------|
| Browser | User-Agent parsing |
| Browser Version | User-Agent parsing |
| Operating System | User-Agent parsing |
| OS Version | User-Agent parsing |
| Device Type | Screen size + UA (Desktop/Tablet/Mobile) |
| Screen Resolution | window.screen |
| Viewport Size | window.innerWidth/Height |

#### 4.1.5 Page Analytics

| Metric | Description |
|--------|-------------|
| Top Pages | Most viewed pages by pageviews |
| Entry Pages | First page of session (landing pages) |
| Exit Pages | Last page of session |
| Page Value | Revenue attributed to page in journey |
| Avg. Time on Page | Time between page_view events |

### 4.2 Revenue Attribution (Phase 2)

#### 4.2.1 Payment Provider Integration

**Stripe Integration:**
```javascript
// Webhook events to capture
const stripeEvents = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'invoice.paid',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted'
];
```

**Data Captured:**
| Field | Description |
|-------|-------------|
| transaction_id | Stripe payment/subscription ID |
| amount | Transaction amount |
| currency | Payment currency |
| customer_email | For visitor matching |
| product_id | Product/price ID |
| is_subscription | One-time vs recurring |
| mrr_impact | Monthly Recurring Revenue impact |

#### 4.2.2 Revenue Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Total Revenue | Sum of all transactions | SUM(amount) |
| MRR | Monthly Recurring Revenue | SUM(subscription_mrr) |
| ARR | Annual Recurring Revenue | MRR × 12 |
| Revenue per Visitor | Revenue / Unique visitors | Total revenue / visitors |
| Revenue per Session | Revenue / Sessions | Total revenue / sessions |
| Customer LTV | Lifetime value by cohort | SUM(customer_revenue) / customers |
| Conversion Rate | Purchasers / Visitors | Converting visitors / total |

#### 4.2.3 Attribution Models

| Model | Description | Use Case |
|-------|-------------|----------|
| First Touch | 100% credit to first interaction | Brand awareness |
| Last Touch | 100% credit to last interaction | Direct conversion |
| Linear | Equal credit to all touchpoints | Balanced view |
| Time Decay | More credit to recent touchpoints | Short sales cycles |
| Position Based | 40% first, 40% last, 20% middle | Balanced acquisition |

### 4.3 Goals & Funnels (Phase 2)

#### 4.3.1 Goal Types

| Type | Definition | Example |
|------|------------|---------|
| Destination | Page URL match | /thank-you |
| Event | Custom event fired | button_click:signup |
| Duration | Session length | > 3 minutes |
| Pages/Session | Engagement | > 5 pages |

#### 4.3.2 Funnel Configuration

```typescript
interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  created_at: Date;
}

interface FunnelStep {
  order: number;
  name: string;
  type: 'pageview' | 'event';
  match: {
    url_pattern?: string;      // regex or exact
    event_name?: string;
    event_properties?: Record<string, any>;
  };
  is_required: boolean;
}
```

**Funnel Metrics:**
- Step conversion rate
- Drop-off count and percentage
- Time between steps
- Path variations

### 4.4 Custom Events (Phase 2)

#### 4.4.1 Event Structure

```typescript
interface CustomEvent {
  name: string;                    // e.g., 'button_click'
  properties: Record<string, any>; // e.g., { button_id: 'cta-1' }
  timestamp: number;
  visitor_id: string;
  session_id: string;
  page_url: string;
}
```

#### 4.4.2 Auto-Tracked Events

| Event | Trigger | Properties |
|-------|---------|------------|
| page_view | Page load / SPA navigation | url, title, referrer |
| scroll_depth | 25%, 50%, 75%, 90%, 100% thresholds | depth_percentage |
| outbound_click | Click on external link | url, text |
| file_download | Click on file link | filename, extension |
| form_submit | Form submission | form_id, form_name |
| video_play | Video starts playing | video_id, provider |
| video_complete | Video finishes | video_id, watch_time |

#### 4.4.3 JavaScript SDK

```javascript
// Initialize
insighthub.init('SITE_ID');

// Track custom event
insighthub.track('signup_started', {
  plan: 'pro',
  source: 'pricing_page'
});

// Identify user (for cross-device)
insighthub.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro'
});

// Track revenue (alternative to Stripe webhook)
insighthub.revenue({
  amount: 99.00,
  currency: 'USD',
  product: 'Pro Plan'
});
```

### 4.5 Heatmaps (Phase 3)

#### 4.5.1 Heatmap Types

| Type | What It Shows | Data Captured |
|------|---------------|---------------|
| Click Map | Where users click | x, y coordinates, element |
| Move Map | Mouse movement patterns | x, y coordinates (sampled) |
| Scroll Map | How far users scroll | scroll depth percentage |
| Attention Map | Where users spend time | viewport + time on area |

#### 4.5.2 Data Collection

```typescript
interface HeatmapEvent {
  type: 'click' | 'move' | 'scroll';
  page_url: string;
  viewport: { width: number; height: number };
  page_height: number;
  x?: number;           // Click/move position
  y?: number;           // Click/move position
  element?: string;     // CSS selector of clicked element
  scroll_depth?: number; // 0-100 percentage
  timestamp: number;
}
```

**Sampling Strategy:**
- Clicks: 100% captured
- Mouse moves: Sample every 100ms, batch upload
- Scroll: Capture max depth per session

#### 4.5.3 Heatmap Rendering

- Take automated screenshot of page (Puppeteer)
- Store screenshot with page URL hash
- Overlay heatmap data on screenshot
- Support multiple viewports (desktop, tablet, mobile)

### 4.6 Advanced Analytics (Phase 3)

#### 4.6.1 Cohort Analysis

Group users by:
- Acquisition date (daily/weekly/monthly cohorts)
- First traffic source
- First landing page
- User properties

Track cohort:
- Retention (% returning in week 1, 2, 3...)
- Revenue per cohort
- Goal completion rate

#### 4.6.2 User Journey/Path Analysis

```typescript
interface UserPath {
  visitor_id: string;
  session_id: string;
  steps: {
    type: 'pageview' | 'event' | 'goal';
    identifier: string;  // URL or event name
    timestamp: number;
  }[];
  converted: boolean;
  revenue?: number;
}
```

Visualizations:
- Sankey diagram of common paths
- Top paths to conversion
- Drop-off points

#### 4.6.3 Rage Clicks & Dead Clicks

| Metric | Definition | Detection |
|--------|------------|-----------|
| Rage Click | 3+ clicks in same area within 1 second | Click event clustering |
| Dead Click | Click on non-interactive element | Click + no event/navigation |
| Error Click | Click followed by error | Click + error event |

#### 4.6.4 Annotations

```typescript
interface Annotation {
  id: string;
  site_id: string;
  date: Date;
  title: string;
  description?: string;
  category: 'release' | 'campaign' | 'incident' | 'other';
  created_by: string;
}
```

Display as markers on time-series charts.

#### 4.6.5 Alerts

```typescript
interface Alert {
  id: string;
  site_id: string;
  name: string;
  metric: 'visitors' | 'pageviews' | 'revenue' | 'bounce_rate' | 'custom';
  condition: 'above' | 'below' | 'change_percent';
  threshold: number;
  comparison_period: 'hour' | 'day' | 'week';
  channels: ('email' | 'webhook' | 'slack')[];
  is_active: boolean;
}
```

### 4.7 Reporting & Export (Phase 3)

#### 4.7.1 Report Types

| Report | Contents | Format |
|--------|----------|--------|
| Daily Summary | Key metrics email | Email HTML |
| Weekly Report | Week-over-week analysis | Email HTML / PDF |
| Custom Report | User-defined metrics/dimensions | CSV / JSON |
| Scheduled Export | Automated data export | CSV / JSON |

#### 4.7.2 Public Dashboard Sharing

- Generate unique shareable URL
- Optional password protection
- Set expiration date
- Choose which metrics to display
- Custom branding (white-label)

### 4.8 Session Recording (Phase 4 - Future)

#### 4.8.1 Recording Scope

```typescript
interface SessionRecording {
  id: string;
  visitor_id: string;
  session_id: string;
  site_id: string;
  start_time: Date;
  end_time: Date;
  duration_ms: number;
  page_count: number;
  events: RecordingEvent[];
  metadata: {
    device: string;
    browser: string;
    country: string;
    entry_page: string;
  };
}

interface RecordingEvent {
  timestamp: number;
  type: 'dom_mutation' | 'mouse_move' | 'mouse_click' | 
        'scroll' | 'input' | 'page_change';
  data: any; // rrweb format
}
```

#### 4.8.2 Privacy Controls

- Auto-mask sensitive inputs (password, credit card)
- Configurable CSS selectors to mask
- Option to mask all text
- User consent required

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Tracked Websites          Dashboard Users           API Consumers   │
│  (tracking.js)             (Next.js App)             (REST API)     │
└────────┬───────────────────────┬─────────────────────────┬──────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EDGE / CDN                                   │
│                    (Cloudflare / Vercel Edge)                        │
│         - Script delivery    - Static assets    - Edge functions     │
└────────┬───────────────────────┬─────────────────────────┬──────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                                 │
│                      (Railway - Node.js)                             │
├─────────────────────────────────────────────────────────────────────┤
│  Event Collector API    │  Webhook Handler    │  Batch Processor     │
│  - Validate events      │  - Stripe webhooks  │  - Aggregate data    │
│  - Enrich with geo/ua   │  - Payment events   │  - Compute metrics   │
│  - Queue for processing │  - Match to visitor │  - Generate heatmaps │
└────────┬───────────────────────┬─────────────────────────┬──────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MESSAGE QUEUE                                  │
│                    (Redis Streams / BullMQ)                          │
│              - Buffer high traffic   - Retry failed jobs             │
└────────┬───────────────────────────────────────────────────┬────────┘
         │                                                   │
         ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │    ClickHouse    │  │    PostgreSQL    │  │      Redis       │  │
│  │   (Analytics)    │  │   (Application)  │  │     (Cache)      │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  │
│  │ - Raw events     │  │ - Users/Auth     │  │ - Live visitors  │  │
│  │ - Aggregated     │  │ - Sites config   │  │ - Session state  │  │
│  │   metrics        │  │ - Goals/Funnels  │  │ - Rate limiting  │  │
│  │ - Heatmap data   │  │ - Alerts config  │  │ - Query cache    │  │
│  │ - Time-series    │  │ - Team members   │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│                      (Vercel - Next.js 14)                           │
├─────────────────────────────────────────────────────────────────────┤
│  Dashboard UI       │   API Routes        │   Auth (NextAuth)        │
│  - Real-time stats  │   - REST endpoints  │   - Email/password       │
│  - Charts/graphs    │   - Data export     │   - OAuth (Google)       │
│  - Heatmap viewer   │   - Public API      │   - API keys             │
│  - Settings         │   - Webhooks out    │   - Team invites         │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

#### 5.2.1 Frontend (Dashboard)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14 (App Router) | Server components, great DX, Vercel native |
| UI Library | React 18 | Industry standard |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Components | shadcn/ui | Beautiful, accessible, customizable |
| Charts | Recharts + Tremor | Feature-rich, React-native |
| State | Zustand | Simple, lightweight |
| Forms | React Hook Form + Zod | Type-safe validation |
| Tables | TanStack Table | Powerful data tables |
| Date Handling | date-fns | Lightweight, tree-shakeable |
| Heatmap Rendering | Custom Canvas + D3.js | Performance |

#### 5.2.2 Backend (API & Ingestion)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 20 LTS | Fast, huge ecosystem |
| Framework | Fastify | 2-3x faster than Express |
| Validation | Zod | Shared with frontend |
| Queue | BullMQ (Redis) | Reliable job processing |
| Geolocation | MaxMind GeoLite2 | Free, accurate, offline |
| User-Agent | ua-parser-js | Comprehensive parsing |
| Rate Limiting | rate-limiter-flexible | Redis-backed |
| Webhook Signing | Stripe SDK | Standard verification |

#### 5.2.3 Databases

| Database | Purpose | Hosting |
|----------|---------|---------|
| ClickHouse | Analytics events, time-series | ClickHouse Cloud or self-host |
| PostgreSQL | Application data, auth | Railway or Neon |
| Redis | Cache, queues, real-time | Railway or Upstash |

**Why ClickHouse for Analytics:**
- Column-oriented (perfect for aggregations)
- 100-1000x faster than PostgreSQL for analytics
- Excellent compression (10x smaller storage)
- Built-in time-series functions
- Handles billions of rows

#### 5.2.4 Tracking Script

| Aspect | Technology | Target |
|--------|------------|--------|
| Language | TypeScript → minified JS | < 5KB gzipped |
| Bundler | esbuild | Fastest builds |
| Fingerprinting | FingerprintJS (lite) | Privacy-respecting |
| Compression | Brotli/Gzip | Smaller transfer |

### 5.3 Data Flow

#### 5.3.1 Event Ingestion Flow

```
1. User visits tracked site
   │
   ▼
2. tracking.js loads (async, deferred)
   │
   ▼
3. Script generates/retrieves visitor_id
   │
   ▼
4. Page view event created
   │
   ├─► Batched with other events (5s window)
   │
   ▼
5. POST to /api/collect (beacon API for unload)
   │
   ▼
6. Ingestion API receives event batch
   │
   ├─► Validate site_id and origin
   ├─► Enrich with geo (IP → country, no IP stored)
   ├─► Parse user-agent
   ├─► Generate session_id if needed
   │
   ▼
7. Push to Redis Stream (queue)
   │
   ▼
8. Worker picks up batch
   │
   ├─► Insert raw events to ClickHouse
   ├─► Update real-time counters in Redis
   │
   ▼
9. Data available in dashboard (< 5 min)
```

#### 5.3.2 Revenue Attribution Flow

```
1. User visits site (visitor_id = "abc123")
   │
   ▼
2. User completes checkout (Stripe Checkout)
   │
   ├─► InsightHub sets insighthub_vid cookie
   ├─► Checkout includes client_reference_id = "abc123"
   │
   ▼
3. Stripe webhook: checkout.session.completed
   │
   ▼
4. InsightHub webhook handler
   │
   ├─► Extract client_reference_id
   ├─► Match to visitor journey
   ├─► Calculate attribution
   │
   ▼
5. Store in ClickHouse: revenue_events table
   │
   ▼
6. Dashboard shows revenue by source
```

### 5.4 Scalability Considerations

#### 5.4.1 Event Ingestion Scaling

```
Target: 100M events/month = ~40 events/second average
Peak:   5x average = ~200 events/second

Architecture:
├─► Vercel Edge Functions for geographic distribution
├─► Multiple Railway instances behind load balancer
├─► Redis Streams for buffering (survives backend restart)
├─► ClickHouse handles high write throughput
```

#### 5.4.2 Query Performance

```
Strategies:
├─► Materialized views for common aggregations
├─► Pre-aggregate hourly/daily rollups
├─► Query result caching in Redis (TTL: 5 min)
├─► Sampling for very large datasets
```

---

## 6. Database Design

### 6.1 ClickHouse Schema

#### 6.1.1 Raw Events Table

```sql
CREATE TABLE events (
    -- Identifiers
    event_id UUID DEFAULT generateUUIDv4(),
    site_id String,
    visitor_id String,
    session_id String,
    
    -- Event data
    event_name LowCardinality(String),  -- 'page_view', 'click', custom
    event_properties String,             -- JSON string
    
    -- Page context
    page_url String,
    page_path String,
    page_title String,
    page_referrer String,
    
    -- Attribution (UTM)
    utm_source LowCardinality(String),
    utm_medium LowCardinality(String),
    utm_campaign String,
    utm_term String,
    utm_content String,
    channel_group LowCardinality(String),
    
    -- Technology
    browser LowCardinality(String),
    browser_version LowCardinality(String),
    os LowCardinality(String),
    os_version LowCardinality(String),
    device_type LowCardinality(String),  -- desktop, mobile, tablet
    screen_width UInt16,
    screen_height UInt16,
    viewport_width UInt16,
    viewport_height UInt16,
    
    -- Geographic
    country_code LowCardinality(FixedString(2)),
    region String,
    city String,
    timezone String,
    language LowCardinality(String),
    
    -- Timestamps
    timestamp DateTime64(3),
    created_at DateTime DEFAULT now(),
    
    -- Session tracking
    is_new_visitor UInt8,
    is_new_session UInt8,
    session_start DateTime64(3),
    
    -- Heatmap data (nullable for non-heatmap events)
    heatmap_x Nullable(UInt16),
    heatmap_y Nullable(UInt16),
    scroll_depth Nullable(UInt8)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, timestamp, visitor_id, event_name)
TTL timestamp + INTERVAL 3 YEAR
SETTINGS index_granularity = 8192;
```

#### 6.1.2 Sessions Table (Materialized View)

```sql
CREATE MATERIALIZED VIEW sessions_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(session_start)
ORDER BY (site_id, session_start, session_id)
AS SELECT
    site_id,
    visitor_id,
    session_id,
    
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    
    -- First touch attribution
    argMin(utm_source, timestamp) as first_utm_source,
    argMin(utm_medium, timestamp) as first_utm_medium,
    argMin(utm_campaign, timestamp) as first_utm_campaign,
    argMin(channel_group, timestamp) as first_channel_group,
    argMin(page_referrer, timestamp) as first_referrer,
    
    -- Entry/exit pages
    argMin(page_path, timestamp) as entry_page,
    argMax(page_path, timestamp) as exit_page,
    
    -- Metrics
    count() as event_count,
    countIf(event_name = 'page_view') as pageview_count,
    max(scroll_depth) as max_scroll_depth,
    
    -- Technology (first of session)
    argMin(device_type, timestamp) as device_type,
    argMin(browser, timestamp) as browser,
    argMin(os, timestamp) as os,
    argMin(country_code, timestamp) as country_code,
    
    -- Visitor status
    max(is_new_visitor) as is_new_visitor
    
FROM events
GROUP BY site_id, visitor_id, session_id;
```

#### 6.1.3 Revenue Events Table

```sql
CREATE TABLE revenue_events (
    event_id UUID DEFAULT generateUUIDv4(),
    site_id String,
    visitor_id String,
    session_id String,
    
    -- Transaction data
    transaction_id String,
    transaction_type LowCardinality(String),  -- 'one_time', 'subscription', 'refund'
    amount Decimal(12, 2),
    currency LowCardinality(FixedString(3)),
    amount_usd Decimal(12, 2),  -- Normalized to USD
    
    -- Subscription data
    is_subscription UInt8,
    subscription_id Nullable(String),
    mrr_change Decimal(12, 2),  -- Can be negative for cancellations
    
    -- Product data
    product_id String,
    product_name String,
    
    -- Customer data
    customer_id String,
    customer_email String,
    
    -- Attribution (from visitor journey)
    attributed_source LowCardinality(String),
    attributed_medium LowCardinality(String),
    attributed_campaign String,
    attributed_channel LowCardinality(String),
    attribution_model LowCardinality(String),
    
    -- Timestamps
    timestamp DateTime64(3),
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, timestamp, transaction_id)
TTL timestamp + INTERVAL 3 YEAR;
```

#### 6.1.4 Heatmap Aggregates Table

```sql
CREATE TABLE heatmap_data (
    site_id String,
    page_url_hash String,  -- MD5 of URL
    page_url String,
    
    -- Viewport bucket
    viewport_bucket LowCardinality(String),  -- 'desktop', 'tablet', 'mobile'
    
    -- Click data (aggregated grid)
    click_x UInt16,
    click_y UInt16,
    click_count UInt32,
    
    -- Scroll data
    scroll_depth UInt8,
    scroll_count UInt32,
    
    -- Time window
    date Date,
    
    -- For screenshot management
    screenshot_id Nullable(String)
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, page_url_hash, viewport_bucket, date, click_x, click_y, scroll_depth);
```

#### 6.1.5 Daily Rollups Table

```sql
CREATE MATERIALIZED VIEW daily_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date)
AS SELECT
    site_id,
    toDate(timestamp) as date,
    
    -- Visitor metrics
    uniq(visitor_id) as unique_visitors,
    uniqIf(visitor_id, is_new_visitor = 1) as new_visitors,
    count() as total_events,
    countIf(event_name = 'page_view') as pageviews,
    
    -- Session metrics
    uniq(session_id) as sessions,
    
    -- Engagement
    avg(scroll_depth) as avg_scroll_depth,
    
    -- By source (arrays for top sources)
    topK(10)(utm_source) as top_sources,
    topK(10)(channel_group) as top_channels,
    topK(10)(page_path) as top_pages,
    topK(10)(country_code) as top_countries
    
FROM events
GROUP BY site_id, date;
```

### 6.2 PostgreSQL Schema

#### 6.2.1 Core Tables

```sql
-- Organizations (for multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Branding (white-label)
    logo_url TEXT,
    primary_color VARCHAR(7),  -- #RRGGBB
    custom_domain VARCHAR(255),
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    plan_limits JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    
    -- Email verification
    email_verified_at TIMESTAMPTZ,
    
    -- Auth
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    UNIQUE(organization_id, user_id)
);

-- Sites (websites being tracked)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    allowed_hosts TEXT[],  -- Array of allowed hostnames
    
    -- Tracking settings
    tracking_id VARCHAR(50) UNIQUE NOT NULL,  -- Used in tracking script
    is_active BOOLEAN DEFAULT true,
    
    -- Feature flags
    enable_heatmaps BOOLEAN DEFAULT true,
    enable_recordings BOOLEAN DEFAULT false,
    
    -- Privacy settings
    anonymize_ips BOOLEAN DEFAULT true,
    respect_dnt BOOLEAN DEFAULT true,
    cookie_consent_mode VARCHAR(50) DEFAULT 'strict',
    
    -- Data retention
    data_retention_days INTEGER DEFAULT 1095,  -- 3 years
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,  -- SHA256 of actual key
    key_prefix VARCHAR(10) NOT NULL,  -- First 10 chars for display
    
    permissions TEXT[] DEFAULT '{}',  -- ['read', 'write', 'admin']
    rate_limit INTEGER DEFAULT 1000,  -- Requests per hour
    
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    goal_type VARCHAR(50) NOT NULL,  -- 'destination', 'event', 'duration', 'pages'
    config JSONB NOT NULL,
    
    -- For destination goals
    -- config: { "match_type": "exact|contains|regex", "pattern": "/thank-you" }
    
    -- For event goals
    -- config: { "event_name": "signup", "properties": { "plan": "pro" } }
    
    -- For duration goals
    -- config: { "operator": "gte", "seconds": 180 }
    
    -- For pages goals
    -- config: { "operator": "gte", "count": 5 }
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funnels
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    
    step_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    step_type VARCHAR(50) NOT NULL,  -- 'pageview', 'event'
    config JSONB NOT NULL,
    
    is_required BOOLEAN DEFAULT true,
    
    UNIQUE(funnel_id, step_order)
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    name VARCHAR(255) NOT NULL,
    
    metric VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,  -- 'above', 'below', 'change_percent'
    threshold DECIMAL(12, 2) NOT NULL,
    comparison_period VARCHAR(50) DEFAULT 'day',
    
    notify_channels TEXT[] DEFAULT '{"email"}',
    notify_emails TEXT[],
    webhook_url TEXT,
    slack_webhook TEXT,
    
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annotations
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    annotation_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connections
CREATE TABLE payment_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL,  -- 'stripe', 'lemonsqueezy', 'paddle'
    
    -- Encrypted credentials
    credentials_encrypted BYTEA,
    
    webhook_secret_encrypted BYTEA,
    webhook_endpoint_id VARCHAR(255),
    
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Dashboards
CREATE TABLE shared_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    share_token VARCHAR(100) UNIQUE NOT NULL,
    
    -- Access control
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    
    -- What to show
    visible_widgets TEXT[] DEFAULT '{}',
    date_range VARCHAR(50) DEFAULT 'last_30_days',
    
    -- Branding
    show_branding BOOLEAN DEFAULT true,
    custom_title VARCHAR(255),
    
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sites_tracking_id ON sites(tracking_id);
CREATE INDEX idx_sites_org ON sites(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_goals_site ON goals(site_id);
CREATE INDEX idx_funnels_site ON funnels(site_id);
CREATE INDEX idx_alerts_site ON alerts(site_id);
CREATE INDEX idx_annotations_site_date ON annotations(site_id, annotation_date);
CREATE INDEX idx_shared_token ON shared_dashboards(share_token);
```

### 6.3 Redis Data Structures

```javascript
// Real-time visitors (last 5 minutes)
// Key: realtime:{site_id}
// Type: Sorted Set
// Score: timestamp, Value: visitor_id
ZADD realtime:abc123 1703704800 "visitor_xyz"
ZRANGEBYSCORE realtime:abc123 (NOW-5min) NOW

// Active sessions
// Key: session:{session_id}
// Type: Hash
// TTL: 30 minutes (sliding)
HSET session:sess_123 visitor_id "v_abc" started_at 1703704800 last_seen 1703705100

// Rate limiting
// Key: ratelimit:{site_id}:{minute}
// Type: String (counter)
// TTL: 60 seconds
INCR ratelimit:abc123:1703704800
EXPIRE ratelimit:abc123:1703704800 60

// Query cache
// Key: cache:query:{hash}
// Type: String (JSON)
// TTL: 5 minutes
SET cache:query:md5hash '{"visitors":1234}' EX 300

// Live event stream (for real-time dashboard)
// Stream: events:{site_id}
XADD events:abc123 * type "page_view" url "/pricing"
XREAD BLOCK 5000 STREAMS events:abc123 $
```

---

## 7. API Specifications

### 7.1 Event Collection API

#### 7.1.1 Collect Events

```
POST /api/collect
Content-Type: application/json

Headers:
  X-Site-ID: {tracking_id}
  X-Visitor-ID: {visitor_id}
  Origin: https://example.com
```

**Request Body:**
```json
{
  "events": [
    {
      "name": "page_view",
      "timestamp": 1703704800000,
      "properties": {
        "url": "https://example.com/pricing",
        "path": "/pricing",
        "title": "Pricing - Example",
        "referrer": "https://google.com",
        "utm_source": "google",
        "utm_medium": "cpc",
        "utm_campaign": "brand"
      },
      "context": {
        "viewport_width": 1920,
        "viewport_height": 1080,
        "screen_width": 1920,
        "screen_height": 1080,
        "timezone": "America/New_York",
        "language": "en-US"
      }
    }
  ],
  "session": {
    "id": "sess_abc123",
    "started_at": 1703704800000,
    "is_new": true
  },
  "visitor": {
    "id": "v_xyz789",
    "is_new": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "events_received": 1
}
```

#### 7.1.2 Heatmap Data

```
POST /api/collect/heatmap
```

**Request Body:**
```json
{
  "page_url": "https://example.com/pricing",
  "page_url_hash": "abc123",
  "viewport": { "width": 1920, "height": 1080 },
  "page_height": 3500,
  "events": [
    { "type": "click", "x": 500, "y": 300, "element": "button.cta" },
    { "type": "scroll", "depth": 75 }
  ]
}
```

### 7.2 Dashboard API

#### 7.2.1 Authentication

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

#### 7.2.2 Sites

```
GET    /api/sites                  # List sites
POST   /api/sites                  # Create site
GET    /api/sites/{id}             # Get site
PATCH  /api/sites/{id}             # Update site
DELETE /api/sites/{id}             # Delete site
GET    /api/sites/{id}/snippet     # Get tracking code
```

#### 7.2.3 Analytics Data

```
GET /api/sites/{id}/stats
Query Parameters:
  - period: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom'
  - start_date: ISO date (for custom)
  - end_date: ISO date (for custom)
  - metrics: 'visitors,pageviews,sessions,bounce_rate,duration'
  - dimensions: 'source,medium,page,country,device'
  - filters: JSON encoded filter object

Response:
{
  "period": { "start": "2024-01-01", "end": "2024-01-31" },
  "metrics": {
    "visitors": { "value": 12500, "change": 15.2 },
    "pageviews": { "value": 45000, "change": 12.1 },
    "sessions": { "value": 18000, "change": 10.5 },
    "bounce_rate": { "value": 42.5, "change": -3.2 },
    "avg_duration": { "value": 185, "change": 8.1 }
  },
  "timeseries": [
    { "date": "2024-01-01", "visitors": 400, "pageviews": 1500 },
    ...
  ],
  "dimensions": {
    "sources": [
      { "name": "google", "visitors": 5000, "revenue": 12500 },
      ...
    ],
    "pages": [
      { "path": "/", "pageviews": 15000, "avg_time": 45 },
      ...
    ]
  }
}
```

#### 7.2.4 Real-time

```
GET /api/sites/{id}/realtime

Response:
{
  "active_visitors": 42,
  "visitors_list": [
    {
      "visitor_id": "v_abc",
      "current_page": "/pricing",
      "country": "US",
      "device": "desktop",
      "source": "google",
      "pages_viewed": 3,
      "time_on_site": 245
    }
  ],
  "top_pages": [
    { "path": "/pricing", "visitors": 15 }
  ],
  "top_sources": [
    { "source": "google", "visitors": 20 }
  ]
}
```

#### 7.2.5 Revenue

```
GET /api/sites/{id}/revenue
Query Parameters:
  - period, start_date, end_date
  - attribution_model: 'first_touch' | 'last_touch' | 'linear'

Response:
{
  "total_revenue": 45000.00,
  "mrr": 3500.00,
  "revenue_per_visitor": 3.60,
  "conversion_rate": 2.4,
  "by_source": [
    {
      "source": "google",
      "medium": "organic",
      "revenue": 15000,
      "transactions": 45,
      "visitors": 5000
    }
  ],
  "transactions": [
    {
      "id": "txn_123",
      "amount": 99.00,
      "product": "Pro Plan",
      "customer_email": "user@example.com",
      "attributed_source": "google",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 7.2.6 Goals & Funnels

```
GET    /api/sites/{id}/goals
POST   /api/sites/{id}/goals
GET    /api/sites/{id}/goals/{goal_id}/stats

GET    /api/sites/{id}/funnels
POST   /api/sites/{id}/funnels
GET    /api/sites/{id}/funnels/{funnel_id}/stats
```

#### 7.2.7 Heatmaps

```
GET /api/sites/{id}/heatmaps
Query Parameters:
  - page_url: URL to get heatmap for
  - viewport: 'desktop' | 'tablet' | 'mobile'
  - type: 'click' | 'scroll' | 'move'
  - period: date range

Response:
{
  "page_url": "/pricing",
  "screenshot_url": "https://...",
  "viewport": { "width": 1920, "height": 1080 },
  "data": {
    "clicks": [
      { "x": 500, "y": 300, "count": 150 },
      ...
    ],
    "scroll": [
      { "depth": 25, "percentage": 95 },
      { "depth": 50, "percentage": 78 },
      { "depth": 75, "percentage": 45 },
      { "depth": 100, "percentage": 12 }
    ]
  }
}
```

### 7.3 Webhook Endpoints

#### 7.3.1 Stripe Webhook

```
POST /api/webhooks/stripe/{site_id}
Headers:
  Stripe-Signature: {signature}
```

Handled Events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.paid`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 7.4 Public API (for customers)

```
Base URL: https://api.insighthub.io/v1
Authentication: Bearer {api_key}

Rate Limits:
  - Free: 100 requests/hour
  - Starter: 1,000 requests/hour
  - Growth: 10,000 requests/hour
  - Enterprise: Unlimited

Endpoints:
GET /sites                    # List sites
GET /sites/{id}/stats         # Get analytics
GET /sites/{id}/realtime      # Real-time data
GET /sites/{id}/revenue       # Revenue data
GET /sites/{id}/events        # Raw events (paginated)
POST /sites/{id}/events       # Send custom event
```

---

## 8. Tracking Script Specifications

### 8.1 Script Architecture

```javascript
// insighthub.js (~4KB minified + gzipped)

(function() {
  'use strict';
  
  const CONFIG = {
    apiEndpoint: 'https://collect.insighthub.io',
    batchSize: 10,
    batchTimeout: 5000,  // 5 seconds
    sessionTimeout: 1800000,  // 30 minutes
  };

  // Core state
  let siteId = null;
  let visitorId = null;
  let sessionId = null;
  let eventQueue = [];
  let batchTimer = null;

  // Initialize
  function init(trackingId, options = {}) {
    siteId = trackingId;
    visitorId = getOrCreateVisitorId();
    sessionId = getOrCreateSessionId();
    
    // Auto-track page view
    if (options.autoTrack !== false) {
      trackPageView();
    }
    
    // Set up SPA navigation tracking
    setupSPATracking();
    
    // Set up scroll tracking
    if (options.trackScroll !== false) {
      setupScrollTracking();
    }
    
    // Set up outbound link tracking
    if (options.trackOutbound !== false) {
      setupOutboundTracking();
    }
    
    // Flush on page unload
    setupUnloadHandler();
  }

  // Visitor ID (persistent)
  function getOrCreateVisitorId() {
    const stored = localStorage.getItem('_ih_vid');
    if (stored) return stored;
    
    const newId = 'v_' + generateId();
    localStorage.setItem('_ih_vid', newId);
    return newId;
  }

  // Session ID (expires after inactivity)
  function getOrCreateSessionId() {
    const stored = sessionStorage.getItem('_ih_sid');
    const lastActivity = parseInt(sessionStorage.getItem('_ih_last') || '0');
    const now = Date.now();
    
    if (stored && (now - lastActivity) < CONFIG.sessionTimeout) {
      sessionStorage.setItem('_ih_last', now.toString());
      return stored;
    }
    
    const newId = 's_' + generateId();
    sessionStorage.setItem('_ih_sid', newId);
    sessionStorage.setItem('_ih_last', now.toString());
    sessionStorage.setItem('_ih_new', '1');
    return newId;
  }

  // Generate random ID
  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Core tracking function
  function track(eventName, properties = {}) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      properties: {
        ...properties,
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        ...getUTMParams()
      },
      context: getContext()
    };
    
    queueEvent(event);
  }

  // Track page view
  function trackPageView(customProps = {}) {
    track('page_view', customProps);
  }

  // Track custom event
  function trackEvent(name, properties = {}) {
    track(name, properties);
  }

  // Identify user (for revenue matching)
  function identify(userId, traits = {}) {
    localStorage.setItem('_ih_uid', userId);
    track('identify', { user_id: userId, ...traits });
  }

  // Track revenue (manual)
  function trackRevenue(data) {
    track('revenue', {
      amount: data.amount,
      currency: data.currency || 'USD',
      product: data.product,
      transaction_id: data.transaction_id
    });
  }

  // Get UTM parameters
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content')
    };
  }

  // Get context data
  function getContext() {
    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  // Event queue management
  function queueEvent(event) {
    eventQueue.push(event);
    
    if (eventQueue.length >= CONFIG.batchSize) {
      flushEvents();
    } else if (!batchTimer) {
      batchTimer = setTimeout(flushEvents, CONFIG.batchTimeout);
    }
  }

  // Send events to server
  function flushEvents() {
    if (eventQueue.length === 0) return;
    
    clearTimeout(batchTimer);
    batchTimer = null;
    
    const events = eventQueue.splice(0, CONFIG.batchSize);
    const isNew = sessionStorage.getItem('_ih_new') === '1';
    sessionStorage.removeItem('_ih_new');
    
    const payload = {
      events,
      session: {
        id: sessionId,
        is_new: isNew
      },
      visitor: {
        id: visitorId,
        is_new: !localStorage.getItem('_ih_returning')
      }
    };
    
    localStorage.setItem('_ih_returning', '1');
    
    // Use sendBeacon for reliability, fall back to fetch
    const url = `${CONFIG.apiEndpoint}/collect`;
    const data = JSON.stringify(payload);
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, data);
    } else {
      fetch(url, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'application/json',
          'X-Site-ID': siteId
        },
        keepalive: true
      }).catch(() => {});
    }
  }

  // SPA navigation tracking
  function setupSPATracking() {
    // History API
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      trackPageView();
    };
    
    window.addEventListener('popstate', () => trackPageView());
  }

  // Scroll depth tracking
  function setupScrollTracking() {
    let maxScroll = 0;
    const thresholds = [25, 50, 75, 90, 100];
    const tracked = new Set();
    
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      maxScroll = Math.max(maxScroll, scrollPercent);
      
      thresholds.forEach(threshold => {
        if (maxScroll >= threshold && !tracked.has(threshold)) {
          tracked.add(threshold);
          track('scroll_depth', { depth: threshold });
        }
      });
    };
    
    window.addEventListener('scroll', throttle(handleScroll, 500), { passive: true });
  }

  // Outbound link tracking
  function setupOutboundTracking() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.href;
      if (!href) return;
      
      try {
        const url = new URL(href);
        if (url.hostname !== window.location.hostname) {
          track('outbound_click', {
            url: href,
            text: link.textContent?.substring(0, 100)
          });
        }
      } catch {}
    });
  }

  // Page unload handler
  function setupUnloadHandler() {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    });
    
    window.addEventListener('pagehide', flushEvents);
  }

  // Throttle helper
  function throttle(fn, wait) {
    let lastTime = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastTime >= wait) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  }

  // Expose public API
  window.insighthub = {
    init,
    track: trackEvent,
    trackPageView,
    identify,
    revenue: trackRevenue
  };
})();
```

### 8.2 Heatmap Tracking Extension

```javascript
// insighthub-heatmaps.js (~2KB additional)

(function() {
  let heatmapData = [];
  const BATCH_SIZE = 50;
  const BATCH_INTERVAL = 10000;  // 10 seconds

  function initHeatmaps() {
    // Click tracking
    document.addEventListener('click', (e) => {
      const rect = document.body.getBoundingClientRect();
      heatmapData.push({
        type: 'click',
        x: e.pageX,
        y: e.pageY,
        element: getSelector(e.target),
        timestamp: Date.now()
      });
      checkBatch();
    });

    // Move tracking (sampled)
    let moveTimer = null;
    document.addEventListener('mousemove', (e) => {
      if (moveTimer) return;
      moveTimer = setTimeout(() => {
        heatmapData.push({
          type: 'move',
          x: e.pageX,
          y: e.pageY,
          timestamp: Date.now()
        });
        moveTimer = null;
        checkBatch();
      }, 100);  // Sample every 100ms
    }, { passive: true });

    // Periodic flush
    setInterval(flushHeatmapData, BATCH_INTERVAL);
    
    // Flush on unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushHeatmapData();
      }
    });
  }

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className) return el.tagName.toLowerCase() + '.' + el.className.split(' ')[0];
    return el.tagName.toLowerCase();
  }

  function checkBatch() {
    if (heatmapData.length >= BATCH_SIZE) {
      flushHeatmapData();
    }
  }

  function flushHeatmapData() {
    if (heatmapData.length === 0) return;
    
    const data = heatmapData.splice(0, BATCH_SIZE);
    
    const payload = {
      page_url: window.location.href,
      page_url_hash: hashCode(window.location.pathname),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      page_height: document.documentElement.scrollHeight,
      events: data
    };
    
    navigator.sendBeacon('/api/collect/heatmap', JSON.stringify(payload));
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Auto-init when main script is ready
  if (window.insighthub) {
    initHeatmaps();
  } else {
    document.addEventListener('insighthub:ready', initHeatmaps);
  }
})();
```

### 8.3 Installation Snippet

```html
<!-- InsightHub Analytics -->
<script>
  (function(i,n,s,h,u,b){i['InsightHubObject']=u;i[u]=i[u]||function(){
  (i[u].q=i[u].q||[]).push(arguments)};i[u].l=1*new Date();b=n.createElement(s);
  b.async=1;b.src=h;n.head.appendChild(b)
  })(window,document,'script','https://cdn.insighthub.io/v1/ih.js','insighthub');
  
  insighthub('init', 'YOUR_TRACKING_ID');
</script>
<!-- End InsightHub Analytics -->
```

---

## 9. Multi-Tenancy & White-Label Architecture

### 9.1 Multi-Tenancy Model

```
Organization (Tenant)
├── Users (team members)
├── Sites (tracked websites)
│   ├── Goals
│   ├── Funnels
│   ├── Alerts
│   └── Integrations
├── API Keys
└── Billing
```

### 9.2 Data Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                     ClickHouse Cluster                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ All events stored in shared tables with site_id column      ││
│  │                                                              ││
│  │ Queries ALWAYS filtered by site_id                          ││
│  │ Row-level security via API layer                            ││
│  │                                                              ││
│  │ Materialized views partitioned by site_id for performance   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                  │
│                                                                  │
│  Row-Level Security (RLS) enforced on all tables                 │
│                                                                  │
│  CREATE POLICY org_isolation ON sites                            │
│    USING (organization_id = current_setting('app.org_id'));     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 White-Label Features

| Feature | Implementation |
|---------|----------------|
| Custom Domain | CNAME to dashboard, SSL via Cloudflare |
| Custom Branding | Logo, colors, name stored per org |
| Custom Tracking Domain | Subdomain per org (org.collect.insighthub.io) |
| Email Templates | Branded email notifications |
| API Branding | Optional custom error messages |
| Dashboard Theme | Light/dark, custom primary color |

### 9.4 Reseller Model

```typescript
interface ResellerOrganization {
  id: string;
  is_reseller: boolean;
  
  // Reseller-specific settings
  reseller_config?: {
    // Billing
    revenue_share_percent: number;  // e.g., 30% to platform
    can_set_pricing: boolean;
    
    // Branding
    platform_name: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    
    // Domains
    app_domain: string;       // e.g., analytics.clientagency.com
    tracking_domain: string;  // e.g., t.clientagency.com
    
    // Limits
    max_sub_organizations: number;
    max_sites_per_sub_org: number;
  };
  
  // Sub-organizations (their clients)
  sub_organizations?: Organization[];
}
```

---

## 10. Security & Privacy

### 10.1 Security Measures

| Area | Implementation |
|------|----------------|
| Authentication | Argon2id password hashing, JWT with rotation |
| API Keys | SHA256 hashed, never stored plain |
| Encryption | TLS 1.3 for all traffic |
| Secrets | Encrypted at rest (AES-256-GCM) |
| CSRF | Token-based protection |
| Rate Limiting | Per-IP and per-API-key limits |
| Input Validation | Zod schemas on all inputs |
| SQL Injection | Parameterized queries only |
| XSS | CSP headers, sanitized outputs |

### 10.2 Privacy Compliance

#### 10.2.1 GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Consent | Configurable consent mode per site |
| Data Minimization | Only collect necessary data |
| IP Anonymization | IP processed for geo, not stored |
| Data Portability | Full export via API |
| Right to Erasure | Delete visitor data endpoint |
| Data Retention | Configurable, auto-cleanup |

#### 10.2.2 Cookie-less Tracking Option

```javascript
// Fingerprint-based tracking (no cookies)
function generateFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    // Avoid canvas fingerprinting for privacy
  ];
  
  return hashComponents(components);
}
```

### 10.3 Data Retention

```sql
-- Auto-cleanup job (runs daily)
ALTER TABLE events
  MODIFY TTL timestamp + toIntervalDay(site_data_retention_days);

-- Manual deletion
DELETE FROM events 
WHERE site_id = '{site_id}' 
  AND visitor_id = '{visitor_id}';
```

---

## 11. Development Phases

### Phase 1: Foundation (Weeks 1-4)

#### Week 1-2: Infrastructure & Core

| Task | Priority | Effort |
|------|----------|--------|
| Project setup (monorepo, TypeScript, ESLint) | P0 | 4h |
| Database setup (PostgreSQL, Redis) | P0 | 4h |
| ClickHouse setup and schema | P0 | 8h |
| Auth system (NextAuth) | P0 | 8h |
| Basic dashboard layout | P0 | 8h |
| CI/CD pipeline | P0 | 4h |

#### Week 3-4: Tracking & Basic Analytics

| Task | Priority | Effort |
|------|----------|--------|
| Tracking script v1 | P0 | 16h |
| Event ingestion API | P0 | 16h |
| Real-time visitor tracking | P0 | 8h |
| Basic metrics dashboard | P0 | 16h |
| Site management CRUD | P0 | 8h |
| Geographic data (MaxMind) | P0 | 4h |

**Phase 1 Deliverable**: Working analytics with pageviews, visitors, sources

---

### Phase 2: Revenue & Goals (Weeks 5-8)

#### Week 5-6: Revenue Attribution

| Task | Priority | Effort |
|------|----------|--------|
| Stripe webhook integration | P0 | 16h |
| Revenue matching algorithm | P0 | 16h |
| Revenue dashboard | P0 | 16h |
| Attribution models | P1 | 12h |

#### Week 7-8: Goals & Funnels

| Task | Priority | Effort |
|------|----------|--------|
| Goal configuration UI | P0 | 12h |
| Goal tracking backend | P0 | 12h |
| Funnel builder UI | P0 | 16h |
| Funnel analytics | P0 | 16h |
| Custom event tracking | P0 | 8h |

**Phase 2 Deliverable**: Full revenue tracking, goals, funnels

---

### Phase 3: Heatmaps & Advanced (Weeks 9-12)

#### Week 9-10: Heatmaps

| Task | Priority | Effort |
|------|----------|--------|
| Heatmap tracking extension | P1 | 16h |
| Click/scroll data storage | P1 | 8h |
| Screenshot capture service | P1 | 12h |
| Heatmap visualization | P1 | 20h |

#### Week 11-12: Advanced Features

| Task | Priority | Effort |
|------|----------|--------|
| UTM parameter deep tracking | P1 | 8h |
| Alerts system | P1 | 12h |
| Annotations | P2 | 6h |
| Public dashboard sharing | P1 | 12h |
| API key management | P1 | 8h |
| Export functionality | P1 | 8h |
| Rage/dead click detection | P2 | 8h |

**Phase 3 Deliverable**: Heatmaps, alerts, sharing, API

---

### Phase 4: Multi-Tenancy & Polish (Weeks 13-16)

#### Week 13-14: Multi-Tenancy

| Task | Priority | Effort |
|------|----------|--------|
| Organization system | P1 | 16h |
| Team invitations | P1 | 8h |
| Role-based access control | P1 | 12h |
| White-label configuration | P1 | 16h |

#### Week 15-16: Polish & Launch Prep

| Task | Priority | Effort |
|------|----------|--------|
| Performance optimization | P0 | 16h |
| Mobile responsive fixes | P0 | 12h |
| Documentation | P0 | 16h |
| Billing integration | P1 | 16h |
| Landing page | P1 | 12h |
| Beta testing & bug fixes | P0 | 20h |

**Phase 4 Deliverable**: Production-ready multi-tenant platform

---

### Phase 5: Session Recording (Future)

| Task | Priority | Effort |
|------|----------|--------|
| rrweb integration | P2 | 20h |
| Recording storage (S3) | P2 | 12h |
| Playback viewer | P2 | 24h |
| Privacy masking | P2 | 12h |
| Search & filtering | P2 | 12h |

---

## 12. Infrastructure & Deployment

### 12.1 Deployment Architecture

```
Production Environment
├── Vercel (Frontend)
│   ├── Next.js Application
│   ├── API Routes (light operations)
│   └── Edge Functions (CDN)
│
├── Railway (Backend)
│   ├── Event Ingestion Service
│   │   └── 2x instances (auto-scale)
│   ├── Worker Service
│   │   └── 1x instance (queue processor)
│   ├── PostgreSQL
│   │   └── Managed instance
│   └── Redis
│       └── Managed instance
│
├── ClickHouse Cloud (Analytics DB)
│   └── Serverless tier (auto-scale)
│
├── Cloudflare (CDN/Edge)
│   ├── Static asset caching
│   ├── Tracking script delivery
│   ├── DDoS protection
│   └── Custom domain SSL
│
└── AWS S3 (Storage)
    ├── Heatmap screenshots
    ├── Session recordings (Phase 5)
    └── Export files
```

### 12.2 Environment Configuration

```bash
# .env.example

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.insighthub.io
NEXT_PUBLIC_COLLECT_URL=https://collect.insighthub.io

# Database
DATABASE_URL=postgresql://...
CLICKHOUSE_URL=https://...
REDIS_URL=redis://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.insighthub.io

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Geolocation
MAXMIND_LICENSE_KEY=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=insighthub-assets

# Monitoring
SENTRY_DSN=...
```

### 12.3 Scaling Strategy

| Traffic | Infrastructure |
|---------|---------------|
| < 10M events/mo | Railway starter, ClickHouse serverless |
| 10-100M events/mo | Railway pro (2 instances), ClickHouse production |
| 100M-1B events/mo | Multi-region, dedicated ClickHouse cluster |
| > 1B events/mo | Custom infrastructure, sharded architecture |

### 12.4 Monitoring & Observability

| Aspect | Tool |
|--------|------|
| Error Tracking | Sentry |
| Logs | Railway logs + Axiom |
| Metrics | Prometheus + Grafana |
| Uptime | Better Uptime |
| Performance | Vercel Analytics |

---

## 13. Monetization Strategy

### 13.1 Pricing Tiers

| Tier | Price | Events/mo | Sites | Team | Features |
|------|-------|-----------|-------|------|----------|
| **Free** | $0 | 5K | 1 | 1 | Basic analytics |
| **Starter** | $19/mo | 50K | 3 | 1 | + Revenue, Goals |
| **Growth** | $49/mo | 250K | 10 | 5 | + Heatmaps, API |
| **Pro** | $99/mo | 1M | 25 | 10 | + Alerts, Export |
| **Business** | $199/mo | 5M | 50 | 25 | + White-label |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | + SLA, Support |

### 13.2 Reseller Program

| Tier | Setup | Revenue Share | Minimum |
|------|-------|---------------|---------|
| Silver | $500 | Platform 30% / Reseller 70% | 10 sites |
| Gold | $2,000 | Platform 20% / Reseller 80% | 50 sites |
| Platinum | $5,000 | Platform 15% / Reseller 85% | 200 sites |

### 13.3 Revenue Projections

| Month | Free Users | Paid Users | MRR |
|-------|------------|------------|-----|
| 3 | 100 | 20 | $800 |
| 6 | 500 | 100 | $4,500 |
| 12 | 2,000 | 400 | $20,000 |
| 24 | 5,000 | 1,000 | $60,000 |

---

## 14. Success Metrics

### 14.1 Product Metrics

| Metric | Target (Month 6) | Target (Year 1) |
|--------|------------------|-----------------|
| Total Sites | 500 | 5,000 |
| Daily Active Users | 200 | 1,500 |
| Events Tracked/Day | 500K | 10M |
| Uptime | 99.9% | 99.95% |
| Dashboard Load Time | < 2s | < 1s |
| Script Load Impact | < 50ms | < 30ms |

### 14.2 Business Metrics

| Metric | Target (Month 6) | Target (Year 1) |
|--------|------------------|-----------------|
| MRR | $5,000 | $50,000 |
| Paying Customers | 100 | 800 |
| Churn Rate | < 8% | < 5% |
| LTV:CAC | > 3:1 | > 5:1 |
| NPS | > 40 | > 50 |

### 14.3 Technical Metrics

| Metric | Target |
|--------|--------|
| Event Ingestion Latency | p99 < 100ms |
| Query Response Time | p95 < 500ms |
| Error Rate | < 0.1% |
| Data Freshness | < 5 min |

---

## 15. Appendices

### 15.1 Glossary

| Term | Definition |
|------|------------|
| Visitor | Unique browser/device identified by visitor_id |
| Session | Group of events with < 30 min gaps |
| Pageview | page_view event triggered on page load |
| Bounce | Session with only 1 pageview |
| Attribution | Assigning credit to traffic sources for conversions |
| UTM | Urchin Tracking Module - URL parameters for campaign tracking |
| Heatmap | Visual representation of click/scroll data |
| Funnel | Multi-step conversion path |
| Goal | Defined conversion action |
| MRR | Monthly Recurring Revenue |
| LTV | Lifetime Value of customer |

### 15.2 Competitive Analysis

| Feature | InsightHub | DataFast | Plausible | Fathom | PostHog |
|---------|------------|----------|-----------|--------|---------|
| Price (100K/mo) | $49 | $99 | $19 | $14 | $0 (self-host) |
| Revenue Tracking | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| Heatmaps | ✅ | ❌ | ❌ | ❌ | ✅ |
| Session Recording | Phase 5 | ❌ | ❌ | ❌ | ✅ |
| Funnels | ✅ | ✅ | ❌ | ❌ | ✅ |
| Self-Host Option | ✅ | ❌ | ✅ | ❌ | ✅ |
| White-Label | ✅ | ❌ | ❌ | ❌ | ❌ |

### 15.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ClickHouse complexity | Medium | High | Use managed service, document well |
| Script blocked by adblockers | Medium | Medium | Custom domain, first-party proxy |
| GDPR complaints | Low | High | Legal review, consent mode |
| High infrastructure costs | Medium | Medium | Usage-based pricing, optimize queries |
| Competition from free tools | High | Medium | Focus on revenue/reseller features |

### 15.4 Future Considerations

1. **Mobile SDK**: Native iOS/Android tracking
2. **Server-side Tracking**: Node.js/Python SDKs
3. **AI Insights**: Automated anomaly detection
4. **A/B Testing**: Built-in experimentation
5. **Integrations**: Zapier, Slack, Notion
6. **Data Warehouse Export**: BigQuery, Snowflake

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-27 | Claude AI | Initial draft |

---

*This PRD is a living document and will be updated as requirements evolve.*
