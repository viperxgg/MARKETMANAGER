/**
 * Google Places API (v1 — places.googleapis.com) client + validators.
 *
 * Why v1: a single Text Search call returns name, address, website, phone,
 * rating and place_id. No follow-up Place Details round-trip needed.
 *
 * Hard rules enforced here:
 *   - Never invent emails. Places API does not return email; we leave it null.
 *   - Never silently drop incomplete leads — we flag them.
 *   - Never log API keys (errors carry codes, not credentials).
 *   - Every result carries provider metadata so the lead is traceable.
 */
export const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

/**
 * Subset of the Places v1 fields we request. Keep the field mask in sync.
 * https://developers.google.com/maps/documentation/places/web-service/text-search#fieldmask
 */
export const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
  "places.location"
].join(",");

export type PlaceRecord = {
  placeId: string;
  name: string;
  formattedAddress: string;
  website: string | null;
  phone: string | null;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  primaryType: string | null;
  types: string[];
  businessStatus: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * `incomplete` does NOT mean "fake" — it means the place exists in Google
 * Places but is missing fields needed for direct outreach (typically a
 * website or a usable name). Downstream pipelines must surface these as
 * incomplete leads, never as fake or contacted.
 */
export type PlaceClassification =
  | { ok: true; place: PlaceRecord }
  | { ok: "incomplete"; place: PlaceRecord; reasons: string[] }
  | { ok: false; reason: string };

export type PlaceSearchInput = {
  /** Free-text query as accepted by Places Text Search. */
  textQuery: string;
  /** ISO 3166-1 alpha-2 country code. Defaults to "SE". */
  regionCode?: string;
  /** BCP-47 language code. Defaults to "sv". */
  languageCode?: string;
  /** 1..20. Defaults to 20 (the API maximum per page). */
  maxResultCount?: number;
  /**
   * Optional Places category bias (e.g. "restaurant", "cafe"). Leave undefined
   * to let the textQuery drive matching.
   */
  includedType?: string;
};

export type PlacesErrorCode =
  | "MISSING_API_KEY"
  | "PERMISSION_DENIED"
  | "QUOTA_EXCEEDED"
  | "INVALID_ARGUMENT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "NO_RESULTS"
  | "UNEXPECTED";

export type PlacesError = {
  code: PlacesErrorCode;
  message: string;
  status?: number;
};

export type PlaceSearchOk = {
  ok: true;
  places: PlaceRecord[];
  /** Per-place classification flags so callers can filter. */
  classifications: PlaceClassification[];
};

export type PlaceSearchResult = PlaceSearchOk | { ok: false; error: PlacesError };

const MAX_PAGE_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 8000;

function isApiKeyConfigured(): boolean {
  const key = process.env.LEAD_SEARCH_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Pure parser for a Places Text Search v1 response. Exported for tests.
 * Never throws — invalid entries are skipped so a single bad row cannot
 * poison the whole batch.
 */
export function parsePlacesTextSearchResponse(payload: unknown): PlaceRecord[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as { places?: unknown };
  const raw = Array.isArray(root.places) ? root.places : [];
  const out: PlaceRecord[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const id = typeof r.id === "string" ? r.id.trim() : "";
    if (!id) continue;

    const displayName = (r.displayName as { text?: unknown } | undefined)?.text;
    const name = typeof displayName === "string" ? displayName.trim() : "";

    const formattedAddress =
      typeof r.formattedAddress === "string" ? r.formattedAddress.trim() : "";

    const website = sanitizeUrl(
      typeof r.websiteUri === "string" ? r.websiteUri : null
    );
    const phone =
      pickString(r.internationalPhoneNumber) ?? pickString(r.nationalPhoneNumber);
    const rating = typeof r.rating === "number" ? r.rating : null;
    const userRatingCount =
      typeof r.userRatingCount === "number" ? r.userRatingCount : null;
    const googleMapsUri = sanitizeUrl(
      typeof r.googleMapsUri === "string" ? r.googleMapsUri : null
    );
    const primaryType =
      typeof r.primaryType === "string" ? r.primaryType : null;
    const types = Array.isArray(r.types)
      ? r.types.filter((t): t is string => typeof t === "string")
      : [];
    const businessStatus =
      typeof r.businessStatus === "string" ? r.businessStatus : null;

    const loc = r.location as { latitude?: unknown; longitude?: unknown } | undefined;
    const latitude = typeof loc?.latitude === "number" ? loc.latitude : null;
    const longitude = typeof loc?.longitude === "number" ? loc.longitude : null;

    out.push({
      placeId: id,
      name,
      formattedAddress,
      website,
      phone: phone ?? null,
      rating,
      userRatingCount,
      googleMapsUri,
      primaryType,
      types,
      businessStatus,
      latitude,
      longitude
    });
  }

  return out;
}

/**
 * Apply the validation rules from the spec:
 *   - reject leads with no usable name
 *   - mark leads without website as incomplete (NOT fake)
 *   - never invent emails (we don't even attempt — surfaced upstream)
 */
export function classifyPlace(place: PlaceRecord): PlaceClassification {
  if (!place.placeId) {
    return { ok: false, reason: "Missing place_id" };
  }
  if (!place.name) {
    return { ok: false, reason: "Missing usable business name" };
  }
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
    return {
      ok: false,
      reason: `Business not operational (${place.businessStatus})`
    };
  }

  const reasons: string[] = [];
  if (!place.website) {
    reasons.push("missing_website");
  }
  if (!place.formattedAddress) {
    reasons.push("missing_address");
  }
  if (!place.phone) {
    reasons.push("missing_phone");
  }

  if (reasons.length > 0) {
    return { ok: "incomplete", place, reasons };
  }
  return { ok: true, place };
}

/**
 * Live Places Text Search call. All errors are returned as typed
 * `PlacesError` objects — never thrown — so callers can branch safely.
 */
export async function searchPlacesText(
  input: PlaceSearchInput,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<PlaceSearchResult> {
  if (!isApiKeyConfigured()) {
    return {
      ok: false,
      error: {
        code: "MISSING_API_KEY",
        message:
          "LEAD_SEARCH_API_KEY is not set. Configure a Google Cloud API key with the Places API (New) enabled."
      }
    };
  }
  const apiKey = process.env.LEAD_SEARCH_API_KEY as string;

  const body: Record<string, unknown> = {
    textQuery: input.textQuery,
    regionCode: input.regionCode ?? "SE",
    languageCode: input.languageCode ?? "sv",
    maxResultCount: clamp(input.maxResultCount ?? MAX_PAGE_SIZE, 1, MAX_PAGE_SIZE)
  };
  if (input.includedType) {
    body.includedType = input.includedType;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  let response: Response;
  try {
    const doFetch = opts.fetchImpl ?? fetch;
    response = await doFetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Auth + field mask MUST be on every Places v1 call.
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "fetch failed"
      }
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return { ok: false, error: classifyHttpError(response.status, await safeText(response)) };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: err instanceof Error ? err.message : "invalid JSON"
      }
    };
  }

  const places = parsePlacesTextSearchResponse(json);
  if (places.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_RESULTS",
        message: "Places API returned 0 results for this query."
      }
    };
  }

  return {
    ok: true,
    places,
    classifications: places.map(classifyPlace)
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function classifyHttpError(status: number, bodyText: string): PlacesError {
  // Body may include a Google error envelope { error: { status, message } }.
  // We never log it raw (it could include the request payload). We DO surface
  // a redacted message to help the operator diagnose.
  const safeBody = bodyText.slice(0, 240).replace(/\bAIza[\w-]+/g, "[redacted]");
  if (status === 400) {
    return { code: "INVALID_ARGUMENT", status, message: safeBody || "Bad request" };
  }
  if (status === 401 || status === 403) {
    return {
      code: "PERMISSION_DENIED",
      status,
      message:
        "Places API rejected the API key. Confirm the key is valid, billing is enabled, and 'Places API (New)' is enabled."
    };
  }
  if (status === 429) {
    return {
      code: "QUOTA_EXCEEDED",
      status,
      message: "Places API quota exceeded. Try again later or raise the daily quota in Google Cloud."
    };
  }
  if (status >= 500) {
    return { code: "RATE_LIMITED", status, message: "Places API server error. Retry with backoff." };
  }
  return { code: "UNEXPECTED", status, message: safeBody || `HTTP ${status}` };
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
