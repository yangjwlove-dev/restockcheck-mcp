import { fetchPublicJson, formatWindow, toIso, type PublicClientOptions } from "../client.js";
import { formatRestockEvent, type FormattedRestockEvent } from "./stores.js";
import type {
  RawCountryStockCount,
  RawSummaryResponse,
  TimeWindowFormatted,
} from "../types.js";

export interface GetRestockSummaryResult {
  generatedAt: number;
  generatedAtIso: string | null;
  scope: RawSummaryResponse["scope"];
  storesCurrentlyInStock: number;
  byCountry: Record<string, RawCountryStockCount>;
  restocks24h: {
    count: number;
    window: TimeWindowFormatted;
  };
  restocks7d: {
    count: number;
    window: TimeWindowFormatted;
  };
  lastRestock: FormattedRestockEvent | null;
  lastRestockByCountry: Record<string, FormattedRestockEvent | null>;
  observationFreshness: {
    sampleSize: number;
    p50Ms: number | null;
    p90Ms: number | null;
    minimumSamples: number;
    scope: string;
  };
}

export async function getRestockSummary(
  options: PublicClientOptions = {}
): Promise<GetRestockSummaryResult> {
  const data = await fetchPublicJson<RawSummaryResponse>("/summary", options);

  const lastRestockByCountry: Record<string, FormattedRestockEvent | null> = {};
  for (const [country, event] of Object.entries(data.lastRestockByCountry ?? {})) {
    lastRestockByCountry[country] = formatRestockEvent(event);
  }

  return {
    generatedAt: data.generatedAt,
    generatedAtIso: toIso(data.generatedAt),
    scope: data.scope,
    storesCurrentlyInStock: data.storesCurrentlyInStock,
    byCountry: data.byCountry,
    restocks24h: {
      count: data.restocks24h.count,
      window: formatWindow(data.restocks24h.window),
    },
    restocks7d: {
      count: data.restocks7d.count,
      window: formatWindow(data.restocks7d.window),
    },
    lastRestock: formatRestockEvent(data.lastRestock),
    lastRestockByCountry,
    observationFreshness: {
      sampleSize: data.observationFreshness.sampleSize,
      p50Ms: data.observationFreshness.p50Ms,
      p90Ms: data.observationFreshness.p90Ms,
      minimumSamples: data.observationFreshness.minimumSamples,
      scope: data.observationFreshness.scope,
    },
  };
}
