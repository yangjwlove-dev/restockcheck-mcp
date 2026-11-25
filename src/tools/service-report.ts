import {
  DEFAULT_API_BASE_URL,
  PUBLIC_API_PREFIX,
  fetchPublicJson,
  formatWindow,
  toIso,
  type PublicClientOptions,
} from "../client.js";
import {
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type RawQuantileSummary,
  type RawServiceReportResponse,
  type TimeWindowFormatted,
} from "../types.js";

export interface GetServiceReliabilityReportInput {
  country?: CountryCode;
  includeStoreBreakdown?: boolean;
}

export interface CompactQuantileSummary {
  sampleSize: number;
  p50Ms: number | null;
  p90Ms: number | null;
  p95Ms: number | null;
  minimumSamples: number;
  method: string | null;
}

export interface PollingTierReliability {
  source: string;
  intervalSeconds: number;
  checks: number;
  firstMeasuredAt: number | null;
  firstMeasuredAtIso: string | null;
  checkInterval: CompactQuantileSummary;
  observationAge: CompactQuantileSummary;
}

export interface StoreReliabilitySummary {
  country: string;
  storeCode: string;
  slug: string;
  name: string;
  city: string;
  pollingTier: string;
  pollingDegraded: boolean;
  currentStatus: string | null;
  polledConfigs: number | null;
  staleOrMissingConfigs: number | null;
  checkSuccessRatePercent: number | null;
  checkSampleSize: number | null;
  measuredHours: number | null;
  lastSuccessfulCheckAt: number | null;
  lastSuccessfulCheckAtIso: string | null;
}

export interface GetServiceReliabilityReportResult {
  license: "CC BY 4.0";
  source: string;
  generatedAt: number;
  generatedAtIso: string | null;
  window: TimeWindowFormatted;
  scope: Record<string, unknown>;
  pollingTiers: PollingTierReliability[];
  alertSentLatency: {
    sampleSize: number;
    totalEvents: number;
    p50Ms: number | null;
    p90Ms: number | null;
    p95Ms: number | null;
    minimumSamples: number;
    scope: string;
    window: TimeWindowFormatted;
  };
  storeSummary: {
    countryFilter: CountryCode | "all";
    totalStores: number;
    healthyCount: number;
    degradedCount: number;
    pausedCount: number;
  };
  stores?: StoreReliabilitySummary[];
}

function compactQuantiles(raw: RawQuantileSummary): CompactQuantileSummary {
  return {
    sampleSize: raw.sampleSize,
    p50Ms: raw.p50Ms,
    p90Ms: raw.p90Ms,
    p95Ms: raw.p95Ms,
    minimumSamples: raw.minimumSamples,
    method: raw.method ?? null,
  };
}

export async function getServiceReliabilityReport(
  input: GetServiceReliabilityReportInput = {},
  options: PublicClientOptions = {}
): Promise<GetServiceReliabilityReportResult> {
  const { country, includeStoreBreakdown = false } = input;
  if (country !== undefined && !SUPPORTED_COUNTRIES.includes(country)) {
    throw new Error(`Unsupported country "${country}". Supported values: ${SUPPORTED_COUNTRIES.join(", ")}.`);
  }

  const data = await fetchPublicJson<RawServiceReportResponse>("/service-report", options);

  const pollingTiers: PollingTierReliability[] = (data.pollingTiers ?? []).map((tier) => ({
    source: tier.source,
    intervalSeconds: tier.intervalSeconds,
    checks: tier.checks,
    firstMeasuredAt: tier.firstMeasuredAt,
    firstMeasuredAtIso: toIso(tier.firstMeasuredAt),
    checkInterval: compactQuantiles(tier.checkInterval),
    observationAge: compactQuantiles(tier.observationAge),
  }));

  const matchedStores = country
    ? (data.stores ?? []).filter((entry) => entry.store.country.toLowerCase() === country)
    : (data.stores ?? []);

  const pausedCount = matchedStores.filter((s) => s.pollingTier === "paused").length;
  const degradedCount = matchedStores.filter((s) => s.pollingDegraded).length;
  const healthyCount = matchedStores.filter((s) => s.currentStatus?.value === "healthy").length;

  const baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");

  const result: GetServiceReliabilityReportResult = {
    license: "CC BY 4.0",
    source: `${baseUrl}${PUBLIC_API_PREFIX}/service-report`,
    generatedAt: data.generatedAt,
    generatedAtIso: toIso(data.generatedAt),
    window: formatWindow(data.window),
    scope: data.scope,
    pollingTiers,
    alertSentLatency: {
      sampleSize: data.alertSentLatency.sampleSize,
      totalEvents: data.alertSentLatency.totalEvents,
      p50Ms: data.alertSentLatency.p50Ms,
      p90Ms: data.alertSentLatency.p90Ms,
      p95Ms: data.alertSentLatency.p95Ms,
      minimumSamples: data.alertSentLatency.minimumSamples,
      scope: data.alertSentLatency.scope,
      window: formatWindow(data.alertSentLatency.window),
    },
    storeSummary: {
      countryFilter: country ?? "all",
      totalStores: matchedStores.length,
      healthyCount,
      degradedCount,
      pausedCount,
    },
  };

  if (includeStoreBreakdown || country !== undefined) {
    result.stores = matchedStores.map((entry) => ({
      country: entry.store.country,
      storeCode: entry.store.store,
      slug: entry.store.slug,
      name: entry.store.name,
      city: entry.store.city,
      pollingTier: entry.pollingTier,
      pollingDegraded: entry.pollingDegraded,
      currentStatus: entry.currentStatus?.value ?? null,
      polledConfigs: entry.currentStatus?.polledConfigs ?? null,
      staleOrMissingConfigs: entry.currentStatus?.staleOrMissingConfigs ?? null,
      checkSuccessRatePercent:
        typeof entry.checkSuccessRate?.value === "number"
          ? Math.round(entry.checkSuccessRate.value * 10_000) / 100
          : null,
      checkSampleSize: entry.checkSuccessRate?.sampleSize ?? null,
      measuredHours: entry.coverage?.measuredHours ?? null,
      lastSuccessfulCheckAt: entry.lastSuccessfulCheckAt,
      lastSuccessfulCheckAtIso: toIso(entry.lastSuccessfulCheckAt),
    }));
  }

  return result;
}
