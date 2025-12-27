import { FastifyInstance } from "fastify";
import { z } from "zod";
import { clickhouse } from "../lib/clickhouse.js";

const clickDataSchema = z.object({
  visitorId: z.string(),
  sessionId: z.string(),
  pageUrl: z.string(),
  x: z.number(),
  y: z.number(),
  elementSelector: z.string().optional(),
  elementText: z.string().optional(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
  timestamp: z.number().optional(),
});

const scrollDataSchema = z.object({
  visitorId: z.string(),
  sessionId: z.string(),
  pageUrl: z.string(),
  maxScrollDepth: z.number().min(0).max(100),
  viewportHeight: z.number(),
  documentHeight: z.number(),
  timestamp: z.number().optional(),
});

export async function heatmapsRoutes(fastify: FastifyInstance) {
  // Track click event
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof clickDataSchema>;
  }>("/sites/:siteId/heatmaps/clicks", async (request, reply) => {
    const { siteId } = request.params;
    const data = clickDataSchema.parse(request.body);

    const clickEvent = {
      site_id: siteId,
      visitor_id: data.visitorId,
      session_id: data.sessionId,
      page_url: data.pageUrl,
      click_x: data.x,
      click_y: data.y,
      element_selector: data.elementSelector || "",
      element_text: data.elementText?.substring(0, 100) || "",
      viewport_width: data.viewportWidth,
      viewport_height: data.viewportHeight,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    try {
      await clickhouse.insert({
        table: "click_events",
        values: [clickEvent],
        format: "JSONEachRow",
      });
    } catch (error) {
      console.error("Failed to insert click event:", error);
    }

    return reply.status(201).send({ success: true });
  });

  // Track scroll depth
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof scrollDataSchema>;
  }>("/sites/:siteId/heatmaps/scroll", async (request, reply) => {
    const { siteId } = request.params;
    const data = scrollDataSchema.parse(request.body);

    const scrollEvent = {
      site_id: siteId,
      visitor_id: data.visitorId,
      session_id: data.sessionId,
      page_url: data.pageUrl,
      max_scroll_depth: data.maxScrollDepth,
      viewport_height: data.viewportHeight,
      document_height: data.documentHeight,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    try {
      await clickhouse.insert({
        table: "scroll_events",
        values: [scrollEvent],
        format: "JSONEachRow",
      });
    } catch (error) {
      console.error("Failed to insert scroll event:", error);
    }

    return reply.status(201).send({ success: true });
  });

  // Get click heatmap data for a page
  fastify.get<{
    Params: { siteId: string };
    Querystring: { pageUrl: string; period?: string; viewportWidth?: number };
  }>("/sites/:siteId/heatmaps/clicks", async (request, reply) => {
    const { siteId } = request.params;
    const { pageUrl, period = "last_7_days", viewportWidth } = request.query;

    if (!pageUrl) {
      return reply.status(400).send({ error: "pageUrl is required" });
    }

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          click_x,
          click_y,
          count() as count,
          element_selector,
          any(element_text) as element_text
        FROM click_events
        WHERE site_id = {siteId:String}
          AND page_url = {pageUrl:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          ${viewportWidth ? "AND viewport_width >= {minWidth:UInt32} AND viewport_width <= {maxWidth:UInt32}" : ""}
        GROUP BY click_x, click_y, element_selector
        ORDER BY count DESC
        LIMIT 10000
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          pageUrl,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          minWidth: viewportWidth ? viewportWidth - 100 : 0,
          maxWidth: viewportWidth ? viewportWidth + 100 : 10000,
        },
      });

      const clicks = await result.json();

      // Aggregate clicks into grid cells for heatmap
      const heatmapData = aggregateClicksToHeatmap(clicks.data as any[]);

      return reply.send({
        pageUrl,
        clicks: clicks.data,
        heatmap: heatmapData,
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
      });
    } catch (error) {
      console.error("Failed to fetch click heatmap:", error);
      return reply.send({ clicks: [], heatmap: [] });
    }
  });

  // Get scroll depth data for a page
  fastify.get<{
    Params: { siteId: string };
    Querystring: { pageUrl: string; period?: string };
  }>("/sites/:siteId/heatmaps/scroll", async (request, reply) => {
    const { siteId } = request.params;
    const { pageUrl, period = "last_7_days" } = request.query;

    if (!pageUrl) {
      return reply.status(400).send({ error: "pageUrl is required" });
    }

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          floor(max_scroll_depth / 10) * 10 as depth_bucket,
          count() as count,
          uniq(visitor_id) as unique_visitors
        FROM scroll_events
        WHERE site_id = {siteId:String}
          AND page_url = {pageUrl:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
        GROUP BY depth_bucket
        ORDER BY depth_bucket ASC
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          pageUrl,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const scrollData = await result.json();

      // Calculate cumulative percentages
      const totalVisitors = (scrollData.data as any[]).reduce(
        (sum: number, row: any) => sum + row.unique_visitors,
        0
      );

      const scrollDepth = (scrollData.data as any[]).map((row: any) => ({
        depth: row.depth_bucket,
        visitors: row.unique_visitors,
        percentage: totalVisitors > 0 ? (row.unique_visitors / totalVisitors) * 100 : 0,
      }));

      return reply.send({
        pageUrl,
        scrollDepth,
        avgScrollDepth: calculateAvgScrollDepth(scrollData.data as any[]),
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
      });
    } catch (error) {
      console.error("Failed to fetch scroll depth:", error);
      return reply.send({ scrollDepth: [], avgScrollDepth: 0 });
    }
  });

  // Get top clicked elements
  fastify.get<{
    Params: { siteId: string };
    Querystring: { pageUrl: string; period?: string; limit?: number };
  }>("/sites/:siteId/heatmaps/elements", async (request, reply) => {
    const { siteId } = request.params;
    const { pageUrl, period = "last_7_days", limit = 20 } = request.query;

    if (!pageUrl) {
      return reply.status(400).send({ error: "pageUrl is required" });
    }

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          element_selector,
          any(element_text) as element_text,
          count() as click_count,
          uniq(visitor_id) as unique_clickers
        FROM click_events
        WHERE site_id = {siteId:String}
          AND page_url = {pageUrl:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          AND element_selector != ''
        GROUP BY element_selector
        ORDER BY click_count DESC
        LIMIT {limit:UInt32}
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          pageUrl,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit,
        },
      });

      const elements = await result.json();
      return reply.send({ elements: elements.data });
    } catch (error) {
      console.error("Failed to fetch clicked elements:", error);
      return reply.send({ elements: [] });
    }
  });
}

interface ClickData {
  click_x: number;
  click_y: number;
  count: number;
}

function aggregateClicksToHeatmap(clicks: ClickData[]): Array<{ x: number; y: number; value: number }> {
  const gridSize = 20; // 20px grid cells
  const grid: Map<string, number> = new Map();

  for (const click of clicks) {
    const gridX = Math.floor(click.click_x / gridSize) * gridSize;
    const gridY = Math.floor(click.click_y / gridSize) * gridSize;
    const key = `${gridX},${gridY}`;
    grid.set(key, (grid.get(key) || 0) + click.count);
  }

  return Array.from(grid.entries()).map(([key, value]) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y, value };
  });
}

function calculateAvgScrollDepth(scrollData: Array<{ depth_bucket: number; unique_visitors: number }>): number {
  if (scrollData.length === 0) return 0;

  const totalWeighted = scrollData.reduce(
    (sum, row) => sum + row.depth_bucket * row.unique_visitors,
    0
  );
  const totalVisitors = scrollData.reduce((sum, row) => sum + row.unique_visitors, 0);

  return totalVisitors > 0 ? totalWeighted / totalVisitors : 0;
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_7_days":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "last_30_days":
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}
