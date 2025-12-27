import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { clickhouse } from "../lib/clickhouse.js";

const customEventSchema = z.object({
  name: z.string().min(1).max(100),
  properties: z.record(z.any()).optional(),
  visitorId: z.string(),
  sessionId: z.string(),
  timestamp: z.number().optional(),
});

export async function eventsRoutes(fastify: FastifyInstance) {
  // Track custom event
  fastify.post<{
    Params: { siteId: string };
    Body: z.infer<typeof customEventSchema>;
  }>("/sites/:siteId/events", async (request, reply) => {
    const { siteId } = request.params;
    const data = customEventSchema.parse(request.body);

    const event = {
      event_id: crypto.randomUUID(),
      site_id: siteId,
      visitor_id: data.visitorId,
      session_id: data.sessionId,
      event_name: data.name,
      event_properties: JSON.stringify(data.properties || {}),
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    // Insert into ClickHouse
    try {
      await clickhouse.insert({
        table: "events",
        values: [event],
        format: "JSONEachRow",
      });
    } catch (error) {
      console.error("Failed to insert event:", error);
    }

    return reply.status(201).send({ success: true, eventId: event.event_id });
  });

  // List custom events for a site
  fastify.get<{
    Params: { siteId: string };
    Querystring: { period?: string; eventName?: string; limit?: number };
  }>("/sites/:siteId/events", async (request, reply) => {
    const { siteId } = request.params;
    const { period = "last_7_days", eventName, limit = 100 } = request.query;

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          event_name,
          event_properties,
          visitor_id,
          session_id,
          timestamp
        FROM events
        WHERE site_id = {siteId:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          ${eventName ? "AND event_name = {eventName:String}" : ""}
        ORDER BY timestamp DESC
        LIMIT {limit:UInt32}
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventName: eventName || "",
          limit,
        },
      });

      const events = await result.json();
      return reply.send({ events: events.data });
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return reply.send({ events: [] });
    }
  });

  // Get event summary/aggregations
  fastify.get<{
    Params: { siteId: string };
    Querystring: { period?: string };
  }>("/sites/:siteId/events/summary", async (request, reply) => {
    const { siteId } = request.params;
    const { period = "last_7_days" } = request.query;

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          event_name,
          count() as count,
          uniq(visitor_id) as unique_visitors,
          uniq(session_id) as unique_sessions
        FROM events
        WHERE site_id = {siteId:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          AND event_name != 'pageview'
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 50
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const summary = await result.json();
      return reply.send({
        events: summary.data,
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
      });
    } catch (error) {
      console.error("Failed to fetch event summary:", error);
      return reply.send({ events: [] });
    }
  });

  // Get event properties breakdown
  fastify.get<{
    Params: { siteId: string; eventName: string };
    Querystring: { period?: string; property?: string };
  }>("/sites/:siteId/events/:eventName/properties", async (request, reply) => {
    const { siteId, eventName } = request.params;
    const { period = "last_7_days", property } = request.query;

    const { startDate, endDate } = getDateRange(period);

    try {
      let query: string;
      
      if (property) {
        query = `
          SELECT 
            JSONExtractString(event_properties, {property:String}) as property_value,
            count() as count
          FROM events
          WHERE site_id = {siteId:String}
            AND event_name = {eventName:String}
            AND timestamp >= {startDate:DateTime}
            AND timestamp <= {endDate:DateTime}
          GROUP BY property_value
          ORDER BY count DESC
          LIMIT 50
        `;
      } else {
        query = `
          SELECT 
            arrayJoin(JSONExtractKeys(event_properties)) as property_name,
            count() as count
          FROM events
          WHERE site_id = {siteId:String}
            AND event_name = {eventName:String}
            AND timestamp >= {startDate:DateTime}
            AND timestamp <= {endDate:DateTime}
          GROUP BY property_name
          ORDER BY count DESC
          LIMIT 50
        `;
      }

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          eventName,
          property: property || "",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const properties = await result.json();
      return reply.send({ properties: properties.data });
    } catch (error) {
      console.error("Failed to fetch event properties:", error);
      return reply.send({ properties: [] });
    }
  });

  // Event timeseries
  fastify.get<{
    Params: { siteId: string };
    Querystring: { period?: string; eventName?: string };
  }>("/sites/:siteId/events/timeseries", async (request, reply) => {
    const { siteId } = request.params;
    const { period = "last_7_days", eventName } = request.query;

    const { startDate, endDate } = getDateRange(period);

    try {
      const query = `
        SELECT 
          toDate(timestamp) as date,
          ${eventName ? "" : "event_name,"}
          count() as count,
          uniq(visitor_id) as unique_visitors
        FROM events
        WHERE site_id = {siteId:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          ${eventName ? "AND event_name = {eventName:String}" : "AND event_name != 'pageview'"}
        GROUP BY date${eventName ? "" : ", event_name"}
        ORDER BY date ASC
      `;

      const result = await clickhouse.query({
        query,
        query_params: {
          siteId,
          eventName: eventName || "",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const timeseries = await result.json();
      return reply.send({ timeseries: timeseries.data });
    } catch (error) {
      console.error("Failed to fetch event timeseries:", error);
      return reply.send({ timeseries: [] });
    }
  });
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
