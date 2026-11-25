#!/usr/bin/env node
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function parseTextContent(result, label) {
  if (result.isError) {
    throw new Error(`${label} returned error: ${JSON.stringify(result.content)}`);
  }
  const first = result.content?.[0];
  if (!first || first.type !== "text") {
    throw new Error(`${label} returned unexpected content: ${JSON.stringify(result.content)}`);
  }
  return JSON.parse(first.text);
}

async function main() {
  const cliPath = path.resolve(process.cwd(), "dist/cli.js");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cliPath],
  });
  const client = new Client({ name: "restockcheck-live-smoke", version: "0.1.0" });

  try {
    await client.connect(transport);

    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    console.log("1. Tools registered:", names.join(", "));
    if (names.length !== 4) {
      throw new Error(`Expected 4 tools, got ${names.length}`);
    }

    const storesRes = await client.callTool({
      name: "list_monitored_apple_stores",
      arguments: { country: "us" },
    });
    const stores = parseTextContent(storesRes, "list_monitored_apple_stores");
    if (!Array.isArray(stores.stores) || stores.stores.length === 0) {
      throw new Error("Expected at least 1 US monitored store");
    }
    const sampleStore = stores.stores[0];
    console.log(
      `2. list_monitored_apple_stores (us): ${stores.counts.totalMatched} stores, active=${stores.counts.activePolling}, inStock=${stores.availabilitySummary.storesCurrentlyInStock}, sample=${sampleStore.slug}`
    );

    const statusRes = await client.callTool({
      name: "get_store_pickup_status",
      arguments: {
        country: sampleStore.country,
        slug: sampleStore.slug,
        recentRestockLimit: 3,
      },
    });
    const status = parseTextContent(statusRes, "get_store_pickup_status");
    console.log(
      `3. get_store_pickup_status (${sampleStore.country}/${sampleStore.slug}): overall=${status.availability.overall}, availableConfigs=${status.availability.availableConfigCount}/${status.availability.totalConfigCount}, pollingTier=${status.polling.tier}`
    );

    const summaryRes = await client.callTool({
      name: "get_restock_summary",
      arguments: {},
    });
    const summary = parseTextContent(summaryRes, "get_restock_summary");
    console.log(
      `4. get_restock_summary: monitoredStores=${summary.scope.monitoredStores}, inStock=${summary.storesCurrentlyInStock}, restocks24h=${summary.restocks24h.count}, restocks7d=${summary.restocks7d.count}`
    );

    const reportRes = await client.callTool({
      name: "get_service_reliability_report",
      arguments: { country: "us" },
    });
    const report = parseTextContent(reportRes, "get_service_reliability_report");
    console.log(
      `5. get_service_reliability_report (us): license=${report.license}, tiers=${report.pollingTiers.length}, alertLatencyP50Ms=${report.alertSentLatency.p50Ms}, usStores=${report.storeSummary.totalStores}`
    );

    console.log("LIVE SMOKE TEST PASSED");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("LIVE SMOKE TEST FAILED:", err);
  process.exit(1);
});
