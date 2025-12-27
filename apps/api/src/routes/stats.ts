import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { clickhouse } from "../lib/clickhouse.js";
import { redis, getCachedQuery, setCachedQuery } from "../lib/redis.js";
import { createHash } from "crypto";

const statsQuerySchema = z.object({
  period: z.enum(["today", "yesterday", "last_7_days", "last_30_days", "custom"]).default("last_7_days"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  metrics: z.string().optional(), // comma-separated
  dimensions: z.string().optional(), // comma-separated
});

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get stats for a site
  fastify.get<{
    Params: { siteId: string };
    Querystring: z.infer<typeof statsQuerySchema>;
  }>("/:siteId", async (request, reply) => {
    const { siteId } = request.params;
    const query = statsQuerySchema.parse(request.query);

    // Calculate date range
    const { startDate, endDate } = getDateRange(query.period, query.start_date, query.end_date);

    // Check cache
    const cacheKey = createHash("md5")
      .update(JSON.stringify({ siteId, ...query, startDate, endDate }))
      .digest("hex");

    const cached = await getCachedQuery(cacheKey);
    if (cached) {
      return cached;
    }

    // Query ClickHouse
    const result = await clickhouse.query({
      query: `
        SELECT
          uniq(visitor_id) as visitors,
          countIf(event_name = 'page_view') as pageviews,
          uniq(session_id) as sessions,
          round(
            countIf(session_id IN (
              SELECT session_id FROM events 
              WHERE site_id = {site_id:String} 
                AND timestamp >= {start_date:DateTime64}
                AND timestamp <= {end_date:DateTime64}
              GROUP BY session_id 
              HAVING countIf(event_name = 'page_view') = 1
            )) / uniq(session_id) * 100, 2
          ) as bounce_rate
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

    const metrics = await result.json();

    // Get timeseries
    const timeseriesResult = await clickhouse.query({
      query: `
        SELECT
          toDate(timestamp) as date,
          uniq(visitor_id) as visitors,
          countIf(event_name = 'page_view') as pageviews
        FROM events
        WHERE site_id = {site_id:String}
          AND timestamp >= {start_date:DateTime64}
          AND timestamp <= {end_date:DateTime64}
        GROUP BY date
        ORDER BY date
      `,
      query_params: {
        site_id: siteId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      format: "JSONEachRow",
    });

    const timeseries = await timeseriesResult.json();

    const response = {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      metrics: metrics[0] || { visitors: 0, pageviews: 0, sessions: 0, bounce_rate: 0 },
      timeseries,
    };

    // Cache for 5 minutes
    await setCachedQuery(cacheKey, response, 300);

    return response;
  });

  // Get real-time data
  fastify.get<{ Params: { siteId: string } }>("/:siteId/realtime", async (request, reply) => {
    const { siteId } = request.params;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Get active visitors from Redis
    const activeVisitors = await redis.zcount(`realtime:${siteId}`, fiveMinutesAgo, "+inf");

    return {
      active_visitors: activeVisitors,
      visitors_list: [], // TODO: Enrich with visitor details
      top_pages: [],
      top_sources: [],
    };
  });

  // Get sources breakdown
  fastify.get<{
    Params: { siteId: string };
    Querystring: z.infer<typeof statsQuerySchema>;
  }>("/:siteId/sources", async (request, reply) => {
    const { siteId } = request.params;
    const query = statsQuerySchema.parse(request.query);
    const { startDate, endDate } = getDateRange(query.period, query.start_date, query.end_date);

    const result = await clickhouse.query({
      query: `
        SELECT
          channel_group,
          utm_source as source,
          utm_medium as medium,
          uniq(visitor_id) as visitors,
          countIf(event_name = 'page_view') as pageviews
        FROM events
        WHERE site_id = {site_id:String}
          AND timestamp >= {start_date:DateTime64}
          AND timestamp <= {end_date:DateTime64}
        GROUP BY channel_group, source, medium
        ORDER BY visitors DESC
        LIMIT 20
      `,
      query_params: {
        site_id: siteId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      format: "JSONEachRow",
    });

    return { data: await result.json() };
  });

  // Get pages breakdown
  fastify.get<{
    Params: { siteId: string };
    Querystring: z.infer<typeof statsQuerySchema>;
  }>("/:siteId/pages", async (request, reply) => {
    const { siteId } = request.params;
    const query = statsQuerySchema.parse(request.query);
    const { startDate, endDate } = getDateRange(query.period, query.start_date, query.end_date);

    const result = await clickhouse.query({
      query: `
        SELECT
          page_path,
          countIf(event_name = 'page_view') as pageviews,
          uniq(visitor_id) as visitors,
          avg(scroll_depth) as avg_scroll
        FROM events
        WHERE site_id = {site_id:String}
          AND timestamp >= {start_date:DateTime64}
          AND timestamp <= {end_date:DateTime64}
          AND event_name = 'page_view'
        GROUP BY page_path
        ORDER BY pageviews DESC
        LIMIT 20
      `,
      query_params: {
        site_id: siteId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      format: "JSONEachRow",
    });

    return { data: await result.json() };
  });
};

function getDateRange(period: string, startStr?: string, endStr?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now);

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "yesterday":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "last_7_days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "last_30_days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "custom":
      if (!startStr || !endStr) {
        throw new Error("start_date and end_date required for custom period");
      }
      startDate = new Date(startStr);
      endDate = new Date(endStr);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}
