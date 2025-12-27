import { Queue, Worker, Job } from "bullmq";
import { redis } from "../lib/redis.js";
import { insertEvents } from "../lib/clickhouse.js";
import type { EnrichedEvent } from "@shared/types";

// Event processing queue
export const eventQueue = new Queue("events", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

// Batch processor for events
let eventBatch: EnrichedEvent[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 5000; // 5 seconds

async function flushBatch() {
  if (eventBatch.length === 0) return;

  const batch = eventBatch;
  eventBatch = [];

  try {
    await insertEvents(batch);
    console.log(`Inserted ${batch.length} events to ClickHouse`);
  } catch (error) {
    console.error("Failed to insert events:", error);
    // Re-queue failed events
    await eventQueue.addBulk(
      batch.map((event) => ({
        name: "process-event",
        data: event,
      }))
    );
  }
}

function scheduleBatchFlush() {
  if (batchTimer) return;
  batchTimer = setTimeout(async () => {
    batchTimer = null;
    await flushBatch();
  }, BATCH_TIMEOUT);
}

// Event worker
export const eventWorker = new Worker(
  "events",
  async (job: Job) => {
    if (job.name === "process-event") {
      eventBatch.push(job.data);

      if (eventBatch.length >= BATCH_SIZE) {
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }
        await flushBatch();
      } else {
        scheduleBatchFlush();
      }
    } else if (job.name === "process-heatmap") {
      // Handle heatmap data
      await processHeatmapData(job.data);
    }
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

async function processHeatmapData(data: any) {
  // Aggregate heatmap data and insert to ClickHouse
  // This can be done in batches similar to events
  console.log("Processing heatmap data:", data.page_url);
}

// Graceful shutdown
eventWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

process.on("SIGTERM", async () => {
  await flushBatch();
  await eventWorker.close();
  await eventQueue.close();
});
