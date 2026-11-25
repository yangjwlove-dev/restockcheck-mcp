import type { PublicApiEnvelope, TimeWindow, TimeWindowFormatted } from "./types.js";

export const DEFAULT_API_BASE_URL = "https://restockcheck.com";
export const PUBLIC_API_PREFIX = "/api/stock/public";
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface PublicClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class RestockCheckApiError extends Error {
  readonly status?: number;
  readonly endpoint: string;

  constructor(message: string, endpoint: string, status?: number) {
    super(message);
    this.name = "RestockCheckApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

export function toIso(ms: number | null | undefined): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

export function formatWindow(window: TimeWindow): TimeWindowFormatted {
  return {
    start: window.start,
    end: window.end,
    startIso: toIso(window.start),
    endIso: toIso(window.end),
  };
}

function buildPublicUrl(subpath: string, baseUrl: string): string {
  if (!subpath.startsWith("/") || subpath.includes("..") || subpath.includes("?")) {
    throw new RestockCheckApiError(`Invalid public API subpath: ${subpath}`, subpath);
  }
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}${PUBLIC_API_PREFIX}${subpath}`;
}

export async function fetchPublicJson<T>(
  subpath: string,
  options: PublicClientOptions = {}
): Promise<T> {
  const baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = buildPublicUrl(subpath, baseUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "restockcheck-mcp/0.1.0",
      },
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RestockCheckApiError(`Request failed for ${url}: ${reason}`, url);
  } finally {
    clearTimeout(timer);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RestockCheckApiError(
      `Unexpected non-JSON response (HTTP ${response.status}) from ${url}`,
      url,
      response.status
    );
  }

  let payload: PublicApiEnvelope<T>;
  try {
    payload = (await response.json()) as PublicApiEnvelope<T>;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RestockCheckApiError(`Invalid JSON response from ${url}: ${reason}`, url, response.status);
  }

  if (!response.ok || payload.code !== 0 || payload.data === undefined) {
    const apiMessage = payload.message || `HTTP ${response.status}`;
    throw new RestockCheckApiError(apiMessage, url, response.status);
  }

  return payload.data;
}
