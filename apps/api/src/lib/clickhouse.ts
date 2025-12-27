import { createClient, ClickHouseClient } from "@clickhouse/client";

let client: ClickHouseClient | null = null;

export function getClickhouse(): ClickHouseClient {
  if (client) return client;

  client = createClient({
    host: process.env.CLICKHOUSE_HOST || "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
    database: process.env.CLICKHOUSE_DATABASE || "insighthub",
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
  });

  return client;
}

export const clickhouse = getClickhouse();

// Initialize schema
export async function initClickhouseSchema() {
  const ch = getClickhouse();

  // Create database if not exists
  await ch.command({
    query: `CREATE DATABASE IF NOT EXISTS ${process.env.CLICKHOUSE_DATABASE || "insighthub"}`,
  });

  // Create events table
  await ch.command({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        event_id UUID,
        site_id String,
        visitor_id String,
        session_id String,
        
        event_name LowCardinality(String),
        event_properties String,
        
        page_url String,
        page_path String,
        page_title String,
        page_referrer String,
        
        utm_source LowCardinality(String),
        utm_medium LowCardinality(String),
        utm_campaign String,
        utm_term String,
        utm_content String,
        channel_group LowCardinality(String),
        
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        os LowCardinality(String),
        os_version LowCardinality(String),
        device_type LowCardinality(String),
        screen_width UInt16,
        screen_height UInt16,
        viewport_width UInt16,
        viewport_height UInt16,
        
        country_code LowCardinality(FixedString(2)),
        region String,
        city String,
        timezone String,
        language LowCardinality(String),
        
        timestamp DateTime64(3),
        created_at DateTime DEFAULT now(),
        
        is_new_visitor UInt8,
        is_new_session UInt8,
        
        heatmap_x Nullable(UInt16),
        heatmap_y Nullable(UInt16),
        scroll_depth Nullable(UInt8)
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp, visitor_id, event_name)
      TTL timestamp + INTERVAL 3 YEAR
      SETTINGS index_granularity = 8192
    `,
  });

  // Create revenue events table
  await ch.command({
    query: `
      CREATE TABLE IF NOT EXISTS revenue_events (
        event_id UUID,
        site_id String,
        visitor_id String,
        session_id String,
        
        transaction_id String,
        transaction_type LowCardinality(String),
        amount Decimal(12, 2),
        currency LowCardinality(FixedString(3)),
        amount_usd Decimal(12, 2),
        
        is_subscription UInt8,
        subscription_id Nullable(String),
        mrr_change Decimal(12, 2),
        
        product_id String,
        product_name String,
        
        customer_id String,
        customer_email String,
        
        attributed_source LowCardinality(String),
        attributed_medium LowCardinality(String),
        attributed_campaign String,
        attributed_channel LowCardinality(String),
        attribution_model LowCardinality(String),
        
        timestamp DateTime64(3),
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp, transaction_id)
      TTL timestamp + INTERVAL 3 YEAR
    `,
  });

  console.log("ClickHouse schema initialized");
}

// Insert events
export async function insertEvents(events: any[]) {
  if (events.length === 0) return;

  const ch = getClickhouse();
  await ch.insert({
    table: "events",
    values: events,
    format: "JSONEachRow",
  });
}

// Query helper
export async function queryStats(
  siteId: string,
  startDate: Date,
  endDate: Date,
  metrics: string[]
) {
  const ch = getClickhouse();

  const metricSelects = metrics
    .map((m) => {
      switch (m) {
        case "visitors":
          return "uniq(visitor_id) as visitors";
        case "pageviews":
          return "countIf(event_name = 'page_view') as pageviews";
        case "sessions":
          return "uniq(session_id) as sessions";
        case "bounce_rate":
          return `round(
            countIf(session_id IN (
              SELECT session_id FROM events 
              WHERE site_id = {site_id:String} 
              GROUP BY session_id 
              HAVING count() = 1
            )) / uniq(session_id) * 100, 2
          ) as bounce_rate`;
        case "avg_duration":
          return "avg(session_duration) as avg_duration";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(", ");

  const result = await ch.query({
    query: `
      SELECT ${metricSelects}
      FROM events
      WHERE site_id = {site_id:String}
        AND timestamp >= {start_date:DateTime64}
        AND timestamp <= {end_date:DateTime64}
    `,
    query_params: {
      site_id: siteId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    },
    format: "JSONEachRow",
  });

  return await result.json();
}
