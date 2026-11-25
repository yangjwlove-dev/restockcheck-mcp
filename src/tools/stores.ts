import { fetchPublicJson, toIso, type PublicClientOptions } from "../client.js";
import {
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type RawCountryStockCount,
  type RawRestockEvent,
  type RawStoreDetailResponse,
  type RawStoresResponse,
  type RawSummaryResponse,
} from "../types.js";

const STORE_SLUG_PATTERN = /^[a-z0-9-]+$/i;

export interface ListMonitoredAppleStoresInput {
  country?: CountryCode;
  onlyActive?: boolean;
}

export interface MonitoredStoreItem {
  country: string;
  storeCode: string;
  slug: string;
  name: string;
  city: string;
  timeZone: string;
  pollingTier: string;
  pollingSource: string | null;
  checkIntervalSeconds: number | null;
  pollingDegraded: boolean;
}

export interface FormattedRestockEvent {
  country?: string;
  storeCode?: string;
  config: string;
  configName?: string;
  startedAt: number | null;
  startedAtIso: string | null;
  endedAt: number | null;
  endedAtIso: string | null;
  durationMinutes: number | null;
}

export interface ListMonitoredAppleStoresResult {
  generatedAt: number;
  generatedAtIso: string | null;
  filter: {
    country: CountryCode | "all";
    onlyActive: boolean;
  };
  counts: {
    totalMatched: number;
    activePolling: number;
    paused: number;
    degraded: number;
  };
  availabilitySummary: {
    storesCurrentlyInStock: number;
    byCountry: Record<string, RawCountryStockCount>;
    restocks24hCount: number;
    restocks7dCount: number;
    lastRestock: FormattedRestockEvent | null;
  };
  stores: MonitoredStoreItem[];
}

export interface GetStorePickupStatusInput {
  country: CountryCode;
  slug: string;
  onlyAvailable?: boolean;
  recentRestockLimit?: number;
}

export interface StoreConfigAvailability {
  config: string;
  name: string;
  model: string;
  modelName: string;
  capacity: string;
  color: string;
  availability: string;
  checkedAt: number | null;
  checkedAtIso: string | null;
}

export interface GetStorePickupStatusResult {
  generatedAt: number;
  generatedAtIso: string | null;
  store: {
    country: string;
    storeCode: string;
    slug: string;
    name: string;
    city: string;
    timeZone: string;
  };
  polling: {
    status: string;
    tier: string;
    source: string | null;
    checkIntervalSeconds: number | null;
    degraded: boolean;
    lastSuccessfulCheckAt: number | null;
    lastSuccessfulCheckAtIso: string | null;
  };
  availability: {
    overall: string;
    availableConfigCount: number;
    totalConfigCount: number;
  };
  configs: StoreConfigAvailability[];
  restocks: {
    count24h: number;
    count7d: number;
    medianInStockMinutes: number | null;
    lastRestock: FormattedRestockEvent | null;
    recentEvents: FormattedRestockEvent[];
  };
  reliability: {
    percentage: number | null;
    sampleSize: number;
    successes: number;
    meaning: string | null;
  } | null;
  sameCityStores: Array<{
    country: string;
    storeCode: string;
    slug: string;
    name: string;
    availability: string | null;
    pollingTier: string | null;
  }>;
}

export function formatRestockEvent(event: RawRestockEvent | null | undefined): FormattedRestockEvent | null {
  if (!event) {
    return null;
  }
  const startedAt = event.startedAt ?? event.time ?? null;
  const formatted: FormattedRestockEvent = {
    config: event.config,
    startedAt,
    startedAtIso: toIso(startedAt),
    endedAt: event.endedAt ?? null,
    endedAtIso: toIso(event.endedAt),
    durationMinutes:
      typeof event.durationMinutes === "number"
        ? Math.round(event.durationMinutes * 100) / 100
        : null,
  };
  if (event.country) {
    formatted.country = event.country;
  }
  if (event.store) {
    formatted.storeCode = event.store;
  }
  if (event.configName) {
    formatted.configName = event.configName;
  }
  return formatted;
}

export async function listMonitoredAppleStores(
  input: ListMonitoredAppleStoresInput = {},
  options: PublicClientOptions = {}
): Promise<ListMonitoredAppleStoresResult> {
  const { country, onlyActive = false } = input;
  if (country !== undefined && !SUPPORTED_COUNTRIES.includes(country)) {
    throw new Error(`Unsupported country "${country}". Supported values: ${SUPPORTED_COUNTRIES.join(", ")}.`);
  }

  const [storesPayload, summaryPayload] = await Promise.all([
    fetchPublicJson<RawStoresResponse>("/stores", options),
    fetchPublicJson<RawSummaryResponse>("/summary", options),
  ]);

  let filtered = storesPayload.stores;
  if (country) {
    filtered = filtered.filter((s) => s.country.toLowerCase() === country);
  }
  if (onlyActive) {
    filtered = filtered.filter((s) => s.pollingTier !== "paused");
  }

  const stores: MonitoredStoreItem[] = filtered.map((s) => ({
    country: s.country,
    storeCode: s.store,
    slug: s.slug,
    name: s.name,
    city: s.city,
    timeZone: s.timeZone,
    pollingTier: s.pollingTier,
    pollingSource: s.pollingSource,
    checkIntervalSeconds: s.checkIntervalSeconds,
    pollingDegraded: s.pollingDegraded,
  }));

  const activePolling = stores.filter((s) => s.pollingTier !== "paused").length;
  const paused = stores.length - activePolling;
  const degraded = stores.filter((s) => s.pollingDegraded).length;

  const byCountry: Record<string, RawCountryStockCount> = country
    ? summaryPayload.byCountry[country]
      ? { [country]: summaryPayload.byCountry[country] }
      : {}
    : summaryPayload.byCountry;

  const storesCurrentlyInStock = country
    ? (summaryPayload.byCountry[country]?.inStock ?? 0)
    : summaryPayload.storesCurrentlyInStock;

  const lastRestockRaw = country
    ? (summaryPayload.lastRestockByCountry[country] ?? null)
    : summaryPayload.lastRestock;

  return {
    generatedAt: summaryPayload.generatedAt,
    generatedAtIso: toIso(summaryPayload.generatedAt),
    filter: {
      country: country ?? "all",
      onlyActive,
    },
    counts: {
      totalMatched: stores.length,
      activePolling,
      paused,
      degraded,
    },
    availabilitySummary: {
      storesCurrentlyInStock,
      byCountry,
      restocks24hCount: summaryPayload.restocks24h.count,
      restocks7dCount: summaryPayload.restocks7d.count,
      lastRestock: formatRestockEvent(lastRestockRaw),
    },
    stores,
  };
}

export async function getStorePickupStatus(
  input: GetStorePickupStatusInput,
  options: PublicClientOptions = {}
): Promise<GetStorePickupStatusResult> {
  const country = input.country;
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    throw new Error(`Unsupported country "${country}". Supported values: ${SUPPORTED_COUNTRIES.join(", ")}.`);
  }

  const normalizedSlug = input.slug.trim().toLowerCase();
  if (!normalizedSlug || !STORE_SLUG_PATTERN.test(normalizedSlug)) {
    throw new Error(
      `Invalid store slug "${input.slug}". Expected lowercase slug such as "soho-r032" or "regent-street-r092".`
    );
  }

  const onlyAvailable = input.onlyAvailable ?? false;
  const recentRestockLimit = input.recentRestockLimit ?? 10;

  const data = await fetchPublicJson<RawStoreDetailResponse>(
    `/store/${country}/${normalizedSlug}`,
    options
  );

  const allConfigs: StoreConfigAvailability[] = (data.configs ?? []).map((c) => ({
    config: c.config,
    name: c.name ?? `${c.modelName} ${c.capacity} ${c.color} (${c.config})`,
    model: c.model,
    modelName: c.modelName,
    capacity: c.capacity,
    color: c.color,
    availability: c.availability,
    checkedAt: c.checkedAt ?? null,
    checkedAtIso: toIso(c.checkedAt),
  }));

  const availableConfigCount = allConfigs.filter((c) => c.availability === "available").length;
  const configs = onlyAvailable
    ? allConfigs.filter((c) => c.availability === "available")
    : allConfigs;

  const rawRecentEvents = data.restockHistory ?? data.restocks24h?.events ?? [];
  const recentEvents = rawRecentEvents
    .slice(0, recentRestockLimit)
    .map((event) => formatRestockEvent(event))
    .filter((event): event is FormattedRestockEvent => event !== null);

  const reliability = data.reliability
    ? {
        percentage:
          typeof data.reliability.percentage === "number"
            ? Math.round(data.reliability.percentage * 100) / 100
            : typeof data.reliability.value === "number"
              ? Math.round(data.reliability.value * 10_000) / 100
              : null,
        sampleSize: data.reliability.sampleSize,
        successes: data.reliability.successes,
        meaning: data.reliability.meaning ?? null,
      }
    : null;

  const sameCityStores = (data.sameCityStores ?? []).map((entry) => ({
    country: entry.store.country,
    storeCode: entry.store.store,
    slug: entry.store.slug,
    name: entry.store.name,
    availability: entry.availability ?? null,
    pollingTier: entry.pollingTier ?? entry.store.pollingTier ?? null,
  }));

  return {
    generatedAt: data.generatedAt,
    generatedAtIso: toIso(data.generatedAt),
    store: {
      country: data.store.country,
      storeCode: data.store.store,
      slug: data.store.slug,
      name: data.store.name,
      city: data.store.city,
      timeZone: data.store.timeZone,
    },
    polling: {
      status: data.polling,
      tier: data.pollingTier,
      source: data.source,
      checkIntervalSeconds: data.checkIntervalSeconds,
      degraded: data.pollingDegraded,
      lastSuccessfulCheckAt: data.lastSuccessfulCheckAt,
      lastSuccessfulCheckAtIso: toIso(data.lastSuccessfulCheckAt),
    },
    availability: {
      overall: data.availability,
      availableConfigCount,
      totalConfigCount: allConfigs.length,
    },
    configs,
    restocks: {
      count24h: data.restocks24h?.count ?? 0,
      count7d: data.restocks7d?.count ?? 0,
      medianInStockMinutes:
        typeof data.medianInStockMinutes === "number"
          ? Math.round(data.medianInStockMinutes * 100) / 100
          : null,
      lastRestock: formatRestockEvent(data.lastRestock),
      recentEvents,
    },
    reliability,
    sameCityStores,
  };
}
