import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PublicClientOptions } from "./client.js";
import { getServiceReliabilityReport } from "./tools/service-report.js";
import { getStorePickupStatus, listMonitoredAppleStores } from "./tools/stores.js";
import { getRestockSummary } from "./tools/summary.js";
import { SUPPORTED_COUNTRIES } from "./types.js";

export const SERVER_NAME = "restockcheck-mcp";
export const SERVER_VERSION = "0.1.0";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function toToolResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
  };
}

export function createServer(clientOptions: PublicClientOptions = {}): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    "list_monitored_apple_stores",
    {
      title: "List Monitored Apple Stores",
      description:
        "List live-tracked hub Apple Stores (filterable by country us/gb/jp/cn) with polling tier, check interval, and live pickup availability summary.",
      inputSchema: {
        country: z
          .enum(SUPPORTED_COUNTRIES)
          .optional()
          .describe("Optional country filter: us, gb, jp, or cn."),
        onlyActive: z
          .boolean()
          .optional()
          .default(false)
          .describe("When true, excludes stores whose polling tier is currently paused."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        const result = await listMonitoredAppleStores(args, clientOptions);
        return toToolResponse(result);
      } catch (err) {
        return toErrorResponse(err);
      }
    }
  );

  server.registerTool(
    "get_store_pickup_status",
    {
      title: "Get Store Pickup Status",
      description:
        "Fetch live pickup status, per-configuration availability, reliability rate, and recent restock history for a specific monitored Apple Store.",
      inputSchema: {
        country: z
          .enum(SUPPORTED_COUNTRIES)
          .describe("Country code of the monitored store: us, gb, jp, or cn."),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/i, "Store slug must contain only letters, digits, and hyphens.")
          .describe(
            "Store slug returned by list_monitored_apple_stores (for example soho-r032, regent-street-r092, sanlitun-r320)."
          ),
        onlyAvailable: z
          .boolean()
          .optional()
          .default(false)
          .describe("When true, returns only configurations currently available for pickup."),
        recentRestockLimit: z
          .number()
          .int()
          .min(0)
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of recent restock events to include (0-50, default 10)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        const result = await getStorePickupStatus(args, clientOptions);
        return toToolResponse(result);
      } catch (err) {
        return toErrorResponse(err);
      }
    }
  );

  server.registerTool(
    "get_restock_summary",
    {
      title: "Get Restock Summary",
      description:
        "Return live public restock summary metrics across monitored hub Apple Stores: in-stock counts globally and by country, 24h/7d restock totals, latest restocks, and observation freshness.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const result = await getRestockSummary(clientOptions);
        return toToolResponse(result);
      } catch (err) {
        return toErrorResponse(err);
      }
    }
  );

  server.registerTool(
    "get_service_reliability_report",
    {
      title: "Get Service Reliability Report",
      description:
        "Return CC BY 4.0 service reliability telemetry: per-tier check interval and observation age quantiles (P50/P90/P95), sample sizes, alert dispatch latency, and optional per-store health status.",
      inputSchema: {
        country: z
          .enum(SUPPORTED_COUNTRIES)
          .optional()
          .describe("Optional country filter (us, gb, jp, cn). Automatically includes filtered per-store breakdown."),
        includeStoreBreakdown: z
          .boolean()
          .optional()
          .default(false)
          .describe("When true, includes compact per-store health status, success rate, and coverage hours."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      try {
        const result = await getServiceReliabilityReport(args, clientOptions);
        return toToolResponse(result);
      } catch (err) {
        return toErrorResponse(err);
      }
    }
  );

  return server;
}
