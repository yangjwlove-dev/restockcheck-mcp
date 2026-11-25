export const SUPPORTED_COUNTRIES = ["us", "gb", "jp", "cn"] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export interface TimeWindow {
  start: number;
  end: number;
}

export interface TimeWindowFormatted extends TimeWindow {
  startIso: string | null;
  endIso: string | null;
}

export interface PublicApiEnvelope<T> {
  code: number;
  message: string;
  data?: T;
}

export interface RawMonitoredStore {
  country: string;
  store: string;
  slug: string;
  name: string;
  city: string;
  directoryCountry?: string;
  directoryStatus?: string;
  timeZone: string;
  evidenceIntervalSeconds: number | null;
  checkIntervalSeconds: number | null;
  pollingSource: string | null;
  pollingTier: string;
  pollingDegraded: boolean;
}

export interface RawStoresResponse {
  stores: RawMonitoredStore[];
}

export interface RawCountryStockCount {
  monitored: number;
  inStock: number;
}

export interface RawRestockEvent {
  country?: string;
  store?: string;
  config: string;
  configName?: string;
  time?: number;
  startedAt?: number;
  endedAt: number | null;
  durationMinutes: number | null;
}

export interface RawSummaryResponse {
  generatedAt: number;
  scope: {
    monitoredStores: number;
    polledConfigs: number;
    countries: string[];
    nationwide: boolean;
    availabilityFreshnessMs: number;
    restocks: string;
  };
  byCountry: Record<string, RawCountryStockCount>;
  storesCurrentlyInStock: number;
  lastRestock: RawRestockEvent | null;
  lastRestockByCountry: Record<string, RawRestockEvent | null>;
  restocks24h: {
    count: number;
    window: TimeWindow;
  };
  restocks7d: {
    count: number;
    window: TimeWindow;
  };
  observationFreshness: {
    sampleSize: number;
    p50Ms: number | null;
    p90Ms: number | null;
    window: TimeWindow;
    minimumSamples: number;
    scope: string;
  };
}

export interface RawStoreConfig {
  source?: string;
  observedIntervalSeconds?: number | null;
  config: string;
  name?: string;
  checkedAt: number | null;
  availability: string;
  model: string;
  modelName: string;
  capacity: string;
  color: string;
}

export interface RawStoreReliability {
  value: number | null;
  sampleSize: number;
  successes: number;
  minimumSamples: number;
  window: TimeWindow;
  includesCurrentPartialHour?: boolean;
  percentage?: number | null;
  meaning?: string;
}

export interface RawSameCityStore {
  store: RawMonitoredStore;
  availability?: string;
  polling?: string;
  pollingTier?: string;
  pollingDegraded?: boolean;
}

export interface RawStoreDetailResponse {
  generatedAt: number;
  monitoringStartedAt: number | null;
  monitoringStartedAtPrecision?: string;
  store: RawMonitoredStore;
  window: TimeWindow;
  lastSuccessfulCheckAt: number | null;
  polling: string;
  checkIntervalSeconds: number | null;
  pollingTier: string;
  pollingDegraded: boolean;
  evidenceIntervalSeconds: number | null;
  source: string | null;
  configs: RawStoreConfig[];
  lastRestock: RawRestockEvent | null;
  restockHistory?: RawRestockEvent[];
  medianInStockMinutes?: number | null;
  sampleSizes?: {
    restocks: number;
    closedRestocks: number;
    observations: number;
    evidenceObservations: number;
  };
  snapshotAt?: number | null;
  lastCheckAt?: number | null;
  availability: string;
  reliability?: RawStoreReliability | null;
  restocks24h?: {
    count: number;
    events?: RawRestockEvent[];
    window?: TimeWindow;
    measuredHours?: number;
    unit?: string;
  };
  restocks7d?: {
    count: number;
    events?: RawRestockEvent[];
    window?: TimeWindow;
    measuredHours?: number;
    unit?: string;
  };
  sameCityStores?: RawSameCityStore[];
}

export interface RawQuantileSummary {
  sampleSize: number;
  p50Ms: number | null;
  p90Ms: number | null;
  p95Ms: number | null;
  window: TimeWindow;
  minimumSamples: number;
  bucketUpperBoundsMs?: Array<number | null>;
  method?: string;
}

export interface RawPollingTierReport {
  source: string;
  intervalSeconds: number;
  firstMeasuredAt: number | null;
  checks: number;
  checkInterval: RawQuantileSummary;
  observationAge: RawQuantileSummary;
}

export interface RawServiceReportStore {
  store: RawMonitoredStore;
  monitoringStartedAt: number | null;
  pollingTier: string;
  pollingDegraded: boolean;
  checkIntervalSeconds: number | null;
  pollingSource: string | null;
  currentStatus?: {
    value: string;
    polledConfigs: number;
    staleOrMissingConfigs: number;
    sampleSize: number;
    freshnessThresholdMs: number;
  };
  coverage?: {
    measuredHours: number;
    firstMeasuredHour: number | null;
    lastMeasuredHour: number | null;
  };
  lastSuccessfulCheckAt: number | null;
  checkSuccessRate?: {
    value: number | null;
    sampleSize: number;
    successes: number;
    minimumSamples: number;
  };
}

export interface RawServiceReportResponse {
  generatedAt: number;
  scope: Record<string, unknown>;
  window: TimeWindow;
  stores: RawServiceReportStore[];
  pollingTiers: RawPollingTierReport[];
  alertSentLatency: {
    sampleSize: number;
    totalEvents: number;
    p50Ms: number | null;
    p90Ms: number | null;
    p95Ms: number | null;
    minimumSamples: number;
    window: TimeWindow;
    scope: string;
  };
}
