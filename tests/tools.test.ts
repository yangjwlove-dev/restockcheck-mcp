import { describe, expect, it, vi } from "vitest";
import {
  RestockCheckApiError,
  getRestockSummary,
  getServiceReliabilityReport,
  getStorePickupStatus,
  listMonitoredAppleStores,
} from "../src/index.js";

const MOCK_STORES_PAYLOAD = {
  code: 0,
  message: "ok",
  data: {
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
      {
        country: "gb",
        store: "R092",
        slug: "regent-street-r092",
        name: "Regent Street",
        city: "London",
        timeZone: "Europe/London",
        evidenceIntervalSeconds: 5,
        checkIntervalSeconds: 5,
        pollingSource: "evidence",
        pollingTier: "evidence_5s",
        pollingDegraded: true,
      },
      {
        country: "jp",
        store: "R079",
        slug: "ginza-r079",
        name: "Ginza",
        city: "Chuo-ku",
        timeZone: "Asia/Tokyo",
        evidenceIntervalSeconds: 60,
        checkIntervalSeconds: null,
        pollingSource: null,
        pollingTier: "paused",
        pollingDegraded: true,
      },
    ],
  },
};

const MOCK_SUMMARY_PAYLOAD = {
  code: 0,
  message: "ok",
  data: {
    generatedAt: 1795573773458,
    scope: {
      monitoredStores: 3,
      polledConfigs: 24,
      countries: ["cn", "gb", "jp", "us"],
      nationwide: false,
      availabilityFreshnessMs: 60000,
      restocks: "config transitions at currently monitored stores",
    },
    byCountry: {
      us: { monitored: 1, inStock: 1 },
      gb: { monitored: 1, inStock: 0 },
      jp: { monitored: 1, inStock: 0 },
      cn: { monitored: 0, inStock: 0 },
    },
    storesCurrentlyInStock: 1,
    lastRestock: {
      country: "us",
      store: "R032",
      config: "MK1F4LL/A",
      configName: "iPhone Duo 256GB Night Sky (MK1F4LL/A)",
      time: 1795572774121,
      endedAt: null,
      durationMinutes: null,
    },
    lastRestockByCountry: {
      us: {
        country: "us",
        store: "R032",
        config: "MK1F4LL/A",
        configName: "iPhone Duo 256GB Night Sky (MK1F4LL/A)",
        time: 1795572774121,
        endedAt: null,
        durationMinutes: null,
      },
      gb: null,
      jp: null,
      cn: null,
    },
    restocks24h: {
      count: 12,
      window: { start: 1795487373458, end: 1795573773458 },
    },
    restocks7d: {
      count: 88,
      window: { start: 1794968973458, end: 1795573773458 },
    },
    observationFreshness: {
      sampleSize: 24,
      p50Ms: 6500,
      p90Ms: 12000,
      window: { start: 1795573773458, end: 1795573773458 },
      minimumSamples: 10,
      scope: "latest successful observation per actively polled store/config",
    },
  },
};

const MOCK_STORE_DETAIL_PAYLOAD = {
  code: 0,
  message: "ok",
  data: {
    generatedAt: 1795573851678,
    monitoringStartedAt: 1794726000000,
    store: MOCK_STORES_PAYLOAD.data.stores[0],
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
      {
        config: "MK1G4LL/A",
        name: "iPhone Duo 512GB Star White (MK1G4LL/A)",
        checkedAt: 1795573826373,
        availability: "unavailable",
        model: "iphoneduo",
        modelName: "iPhone Duo",
        capacity: "512GB",
        color: "Star White",
      },
    ],
    lastRestock: {
      country: "us",
      store: "R032",
      config: "MK1F4LL/A",
      configName: "iPhone Duo 256GB Night Sky (MK1F4LL/A)",
      time: 1795572774121,
      endedAt: null,
      durationMinutes: null,
    },
    restockHistory: [
      {
        country: "us",
        store: "R032",
        config: "MK1F4LL/A",
        configName: "iPhone Duo 256GB Night Sky (MK1F4LL/A)",
        time: 1795572774121,
        endedAt: null,
        durationMinutes: null,
      },
      {
        country: "us",
        store: "R032",
        config: "MK1G4LL/A",
        configName: "iPhone Duo 512GB Star White (MK1G4LL/A)",
        time: 1795560000000,
        endedAt: 1795560240000,
        durationMinutes: 4.0,
      },
    ],
    medianInStockMinutes: 4.1234,
    reliability: {
      value: 0.985,
      sampleSize: 1000,
      successes: 985,
      minimumSamples: 10,
      window: { start: 1795489200000, end: 1795573851678 },
      percentage: 98.5,
      meaning: "successful ingested config checks / all ingested config checks",
    },
    restocks24h: { count: 2 },
    restocks7d: { count: 14 },
    sameCityStores: [
      {
        store: {
          country: "us",
          store: "R095",
          slug: "fifth-avenue-r095",
          name: "Fifth Avenue",
          city: "New York",
          timeZone: "America/New_York",
          evidenceIntervalSeconds: 5,
          checkIntervalSeconds: 5,
          pollingSource: "evidence",
          pollingTier: "evidence_5s",
          pollingDegraded: false,
        },
        availability: "unavailable",
        pollingTier: "evidence_5s",
      },
    ],
  },
};

const MOCK_SERVICE_REPORT_PAYLOAD = {
  code: 0,
  message: "ok",
  data: {
    generatedAt: 1795573866570,
    scope: { monitoredStores: 3, nationwide: false },
    window: { start: 1792980000000, end: 1795573866570 },
    pollingTiers: [
      {
        source: "evidence",
        intervalSeconds: 5,
        firstMeasuredAt: 1794730660190,
        checks: 3941858,
        checkInterval: {
          sampleSize: 3938940,
          p50Ms: 6000,
          p90Ms: 7000,
          p95Ms: 8000,
          window: { start: 1792980000000, end: 1795573866570 },
          minimumSamples: 10,
          method: "histogram upper bounds; overflow quantiles are null",
        },
        observationAge: {
          sampleSize: 3941858,
          p50Ms: 7000,
          p90Ms: 10000,
          p95Ms: 15000,
          window: { start: 1792980000000, end: 1795573866570 },
          minimumSamples: 10,
          method: "histogram upper bounds; overflow quantiles are null",
        },
      },
    ],
    alertSentLatency: {
      sampleSize: 56,
      totalEvents: 144,
      p50Ms: 3430,
      p90Ms: 5693,
      p95Ms: 7589,
      minimumSamples: 50,
      window: { start: 1792981867470, end: 1795573867470 },
      scope: "all alert events; first email/push sent",
    },
    stores: [
      {
        store: MOCK_STORES_PAYLOAD.data.stores[0],
        monitoringStartedAt: 1794726000000,
        pollingTier: "evidence_5s",
        pollingDegraded: false,
        checkIntervalSeconds: 5,
        pollingSource: "evidence",
        currentStatus: {
          value: "healthy",
          polledConfigs: 8,
          staleOrMissingConfigs: 0,
          sampleSize: 8,
          freshnessThresholdMs: 60000,
        },
        coverage: {
          measuredHours: 234,
          firstMeasuredHour: 1794726000000,
          lastMeasuredHour: 1795572000000,
        },
        lastSuccessfulCheckAt: 1795573826373,
        checkSuccessRate: {
          value: 0.9921,
          sampleSize: 10000,
          successes: 9921,
          minimumSamples: 10,
        },
      },
      {
        store: MOCK_STORES_PAYLOAD.data.stores[2],
        monitoringStartedAt: 1794726000000,
        pollingTier: "paused",
        pollingDegraded: true,
        checkIntervalSeconds: null,
        pollingSource: null,
        currentStatus: {
          value: "degraded",
          polledConfigs: 0,
          staleOrMissingConfigs: 8,
          sampleSize: 8,
          freshnessThresholdMs: 60000,
        },
        coverage: {
          measuredHours: 120,
          firstMeasuredHour: 1794726000000,
          lastMeasuredHour: 1795200000000,
        },
        lastSuccessfulCheckAt: null,
        checkSuccessRate: {
          value: 0.85,
          sampleSize: 500,
          successes: 425,
          minimumSamples: 10,
        },
      },
    ],
  },
};

function createMockFetch() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });

    if (url.endsWith("/api/stock/public/stores")) {
      return jsonResponse(MOCK_STORES_PAYLOAD);
    }
    if (url.endsWith("/api/stock/public/summary")) {
      return jsonResponse(MOCK_SUMMARY_PAYLOAD);
    }
    if (url.endsWith("/api/stock/public/store/us/soho-r032")) {
      return jsonResponse(MOCK_STORE_DETAIL_PAYLOAD);
    }
    if (url.endsWith("/api/stock/public/service-report")) {
      return jsonResponse(MOCK_SERVICE_REPORT_PAYLOAD);
    }
    return jsonResponse({ code: -1, message: "Store or city not monitored" }, 404);
  }) as unknown as typeof fetch;
}

describe("restockcheck-mcp tools (mocked fetch)", () => {
  it("list_monitored_apple_stores lists all stores and filters by country / onlyActive", async () => {
    const fetchImpl = createMockFetch();

    const all = await listMonitoredAppleStores({}, { fetchImpl });
    expect(all.counts).toEqual({
      totalMatched: 3,
      activePolling: 2,
      paused: 1,
      degraded: 2,
    });
    expect(all.availabilitySummary.storesCurrentlyInStock).toBe(1);
    expect(all.stores.map((s) => s.slug)).toEqual(["soho-r032", "regent-street-r092", "ginza-r079"]);

    const activeOnly = await listMonitoredAppleStores({ onlyActive: true }, { fetchImpl });
    expect(activeOnly.counts.totalMatched).toBe(2);
    expect(activeOnly.counts.paused).toBe(0);

    const usOnly = await listMonitoredAppleStores({ country: "us" }, { fetchImpl });
    expect(usOnly.counts.totalMatched).toBe(1);
    expect(usOnly.stores[0].storeCode).toBe("R032");
    expect(usOnly.availabilitySummary.byCountry).toEqual({ us: { monitored: 1, inStock: 1 } });
    expect(usOnly.availabilitySummary.lastRestock?.config).toBe("MK1F4LL/A");
  });

  it("get_store_pickup_status returns config availability, filtering, and recent restocks", async () => {
    const fetchImpl = createMockFetch();

    const full = await getStorePickupStatus(
      { country: "us", slug: "SoHo-R032", recentRestockLimit: 1 },
      { fetchImpl }
    );
    expect(full.store.slug).toBe("soho-r032");
    expect(full.availability).toEqual({
      overall: "available",
      availableConfigCount: 1,
      totalConfigCount: 2,
    });
    expect(full.configs).toHaveLength(2);
    expect(full.restocks.recentEvents).toHaveLength(1);
    expect(full.restocks.medianInStockMinutes).toBe(4.12);
    expect(full.reliability?.percentage).toBe(98.5);
    expect(full.sameCityStores[0].slug).toBe("fifth-avenue-r095");

    const availableOnly = await getStorePickupStatus(
      { country: "us", slug: "soho-r032", onlyAvailable: true },
      { fetchImpl }
    );
    expect(availableOnly.configs).toHaveLength(1);
    expect(availableOnly.configs[0].config).toBe("MK1F4LL/A");
  });

  it("get_store_pickup_status rejects invalid slugs and propagates 404 API errors", async () => {
    const fetchImpl = createMockFetch();

    await expect(
      getStorePickupStatus({ country: "us", slug: "../admin" }, { fetchImpl })
    ).rejects.toThrow(/Invalid store slug/);

    await expect(
      getStorePickupStatus({ country: "us", slug: "unknown-store" }, { fetchImpl })
    ).rejects.toThrow(RestockCheckApiError);
  });

  it("get_restock_summary returns formatted summary metrics and ISO timestamps", async () => {
    const fetchImpl = createMockFetch();
    const summary = await getRestockSummary({ fetchImpl });

    expect(summary.storesCurrentlyInStock).toBe(1);
    expect(summary.restocks24h.count).toBe(12);
    expect(summary.restocks7d.count).toBe(88);
    expect(summary.generatedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(summary.observationFreshness.p50Ms).toBe(6500);
    expect(summary.lastRestockByCountry.us?.storeCode).toBe("R032");
    expect(summary.lastRestockByCountry.gb).toBeNull();
  });

  it("get_service_reliability_report returns CC BY 4.0 quantiles and optional store breakdown", async () => {
    const fetchImpl = createMockFetch();

    const compact = await getServiceReliabilityReport({}, { fetchImpl });
    expect(compact.license).toBe("CC BY 4.0");
    expect(compact.pollingTiers).toHaveLength(1);
    expect(compact.pollingTiers[0].checkInterval.p95Ms).toBe(8000);
    expect(compact.alertSentLatency.p50Ms).toBe(3430);
    expect(compact.storeSummary).toEqual({
      countryFilter: "all",
      totalStores: 2,
      healthyCount: 1,
      degradedCount: 1,
      pausedCount: 1,
    });
    expect(compact.stores).toBeUndefined();

    const usBreakdown = await getServiceReliabilityReport({ country: "us" }, { fetchImpl });
    expect(usBreakdown.storeSummary.totalStores).toBe(1);
    expect(usBreakdown.stores).toHaveLength(1);
    expect(usBreakdown.stores?.[0].checkSuccessRatePercent).toBe(99.21);
  });
});
