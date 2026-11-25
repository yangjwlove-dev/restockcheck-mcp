import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer } from "../src/index.js";

describe("MCP protocol end-to-end", () => {
  let stdioClient: Client;

  beforeAll(async () => {
    const cliPath = path.resolve(process.cwd(), "dist/cli.js");
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath],
    });
    stdioClient = new Client({ name: "stdio-test-client", version: "1.0.0" });
    await stdioClient.connect(transport);
  });

  afterAll(async () => {
    await stdioClient.close();
  });

  it("lists all 4 read-only tools over stdio", async () => {
    const listed = await stdioClient.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_restock_summary",
      "get_service_reliability_report",
      "get_store_pickup_status",
      "list_monitored_apple_stores",
    ]);

    for (const tool of listed.tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
  });

  it("executes all 4 tools through MCP JSON-RPC with mocked fetch", async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const ok = (data: unknown) =>
        new Response(JSON.stringify({ code: 0, message: "ok", data }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });

      if (url.endsWith("/stores")) {
        return ok({
          stores: [
            {
              country: "us",
              store: "R032",
              slug: "soho-r032",
              name: "SoHo",
              city: "New York",
              timeZone: "America/New_York",
              evidenceIntervalSeconds: 5,
              checkIntervalSeconds: 5,
              pollingSource: "evidence",
              pollingTier: "evidence_5s",
              pollingDegraded: false,
            },
          ],
        });
      }
      if (url.endsWith("/summary")) {
        return ok({
          generatedAt: 1795573773458,
          scope: {
            monitoredStores: 1,
            polledConfigs: 8,
            countries: ["us"],
            nationwide: false,
            availabilityFreshnessMs: 60000,
            restocks: "config transitions",
          },
          byCountry: { us: { monitored: 1, inStock: 1 } },
          storesCurrentlyInStock: 1,
          lastRestock: null,
          lastRestockByCountry: { us: null },
          restocks24h: { count: 3, window: { start: 1795487373458, end: 1795573773458 } },
          restocks7d: { count: 15, window: { start: 1794968973458, end: 1795573773458 } },
          observationFreshness: {
            sampleSize: 8,
            p50Ms: 5000,
            p90Ms: 9000,
            window: { start: 1795573773458, end: 1795573773458 },
            minimumSamples: 10,
            scope: "latest successful observation",
          },
        });
      }
      if (url.endsWith("/store/us/soho-r032")) {
        return ok({
          generatedAt: 1795573851678,
          monitoringStartedAt: 1794726000000,
          store: {
            country: "us",
            store: "R032",
            slug: "soho-r032",
            name: "SoHo",
            city: "New York",
            timeZone: "America/New_York",
            evidenceIntervalSeconds: 5,
            checkIntervalSeconds: 5,
            pollingSource: "evidence",
            pollingTier: "evidence_5s",
            pollingDegraded: false,
          },
          window: { start: 1792981851678, end: 1795573851678 },
          lastSuccessfulCheckAt: 1795573826373,
          polling: "active",
          checkIntervalSeconds: 5,
          pollingTier: "evidence_5s",
          pollingDegraded: false,
          evidenceIntervalSeconds: 5,
          source: "evidence",
          availability: "available",
          configs: [
            {
              config: "MK1F4LL/A",
              name: "iPhone Duo 256GB Night Sky (MK1F4LL/A)",
              checkedAt: 1795573826373,
              availability: "available",
              model: "iphoneduo",
              modelName: "iPhone Duo",
              capacity: "256GB",
              color: "Night Sky",
            },
          ],
          lastRestock: null,
          restocks24h: { count: 1 },
          restocks7d: { count: 4 },
        });
      }
      if (url.endsWith("/service-report")) {
        return ok({
          generatedAt: 1795573866570,
          scope: { monitoredStores: 1, nationwide: false },
          window: { start: 1792980000000, end: 1795573866570 },
          pollingTiers: [],
          alertSentLatency: {
            sampleSize: 50,
            totalEvents: 60,
            p50Ms: 3000,
            p90Ms: 5000,
            p95Ms: 7000,
            minimumSamples: 50,
            window: { start: 1792981867470, end: 1795573867470 },
            scope: "all alert events",
          },
          stores: [],
        });
      }
      return new Response(JSON.stringify({ code: -1, message: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const server = createServer({ fetchImpl: mockFetch });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "inmemory-test-client", version: "1.0.0" });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const storesRes = await client.callTool({
        name: "list_monitored_apple_stores",
        arguments: { country: "us" },
      });
      const storesJson = JSON.parse((storesRes.content as Array<{ text: string }>)[0].text);
      expect(storesJson.counts.totalMatched).toBe(1);

      const storeRes = await client.callTool({
        name: "get_store_pickup_status",
        arguments: { country: "us", slug: "soho-r032" },
      });
      const storeJson = JSON.parse((storeRes.content as Array<{ text: string }>)[0].text);
      expect(storeJson.availability.availableConfigCount).toBe(1);

      const summaryRes = await client.callTool({
        name: "get_restock_summary",
        arguments: {},
      });
      const summaryJson = JSON.parse((summaryRes.content as Array<{ text: string }>)[0].text);
      expect(summaryJson.restocks24h.count).toBe(3);

      const reportRes = await client.callTool({
        name: "get_service_reliability_report",
        arguments: {},
      });
      const reportJson = JSON.parse((reportRes.content as Array<{ text: string }>)[0].text);
      expect(reportJson.license).toBe("CC BY 4.0");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
