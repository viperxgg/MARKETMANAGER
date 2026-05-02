import { ProductSlug } from "./product-data";
import { isOpenAiTextConfigured } from "./openai-config";
import {
  searchPlacesText,
  type PlaceClassification,
  type PlaceRecord,
  type PlacesError
} from "./google-places";

/**
 * Provider IDs accepted by `LEAD_SEARCH_PROVIDER`.
 *
 * The blueprint requires `LEAD_SEARCH_PROVIDER=google` to mean Google Places
 * (structured business discovery). To keep the env API stable, the value
 * "google" is now an alias for "google-places". The legacy "google-custom-search"
 * id is preserved so existing rows or scripts referring to it still resolve,
 * but it is NOT implemented (returns provider-not-implemented).
 */
export type LeadSearchProviderId =
  | "google-places"
  | "google-custom-search"
  | "serpapi"
  | "bing-web-search"
  | "manual-csv";

export type LeadSearchQuery = {
  productSlug: ProductSlug;
  query: string;
  country: "SE";
  language: "sv";
  limit: number;
};

/**
 * Backward-compatible result shape. Existing consumers (`live-lead-research`)
 * read `title`, `url`, `snippet`, `sourceProvider`. New consumers can read
 * the optional `place` for structured business data and `incomplete*` flags
 * for traceability.
 */
export type LeadSearchResult = {
  title: string;
  url: string;
  snippet: string;
  sourceProvider: LeadSearchProviderId;
  /** Present when sourced from a structured provider (Google Places). */
  place?: PlaceRecord;
  /** True when the source had a usable record but it lacked website/email. */
  incomplete?: boolean;
  incompleteReasons?: string[];
};

export type LeadSearchProviderStatus = {
  providerName: string;
  providerConfigured: boolean;
  providerImplemented: boolean;
  openAiConfigured: boolean;
  missing: string[];
  supportedProviders: LeadSearchProviderId[];
  message: string;
};

export interface LeadSearchProvider {
  id: LeadSearchProviderId;
  name: string;
  status(): LeadSearchProviderStatus;
  search(query: LeadSearchQuery): Promise<LeadSearchResult[]>;
}

class ManualCsvLeadSearchProvider implements LeadSearchProvider {
  id: LeadSearchProviderId = "manual-csv";
  name = "Manual CSV import";

  status() {
    return getLeadSearchProviderStatus();
  }

  async search() {
    return [];
  }
}

/**
 * Google Places provider (Places API v1, Text Search).
 *
 * Maps Place records to the LeadSearchResult shape so the existing pipeline
 * (`enrichSearchResults` etc.) keeps working unchanged: it consumes
 * `title`, `url`, `snippet`. Places without a website are returned with
 * `url=""`, `incomplete=true`, and the structured `place` payload preserved
 * so the downstream layers can flag (not silently drop) them.
 */
class GooglePlacesLeadSearchProvider implements LeadSearchProvider {
  id: LeadSearchProviderId = "google-places";
  name = "Google Places API";

  status() {
    return getLeadSearchProviderStatus();
  }

  async search(query: LeadSearchQuery): Promise<LeadSearchResult[]> {
    const result = await searchPlacesText({
      textQuery: query.query,
      regionCode: query.country, // "SE"
      languageCode: query.language, // "sv"
      maxResultCount: query.limit,
      // Bias toward restaurants/cafés when the query hints at them. We do NOT
      // hard-code a single category — broader local-services use cases will
      // pass plain Swedish queries that cover their own vocab.
      includedType: detectIncludedType(query.query)
    });

    if (!result.ok) {
      // Errors are intentionally surfaced as zero results. The provider's
      // status() exposes configuration state; the dispatcher writes an
      // ExecutionLog entry describing the failure mode.
      logProviderError(result.error);
      return [];
    }

    return result.classifications
      .map((classification) => mapClassificationToResult(classification, this.id))
      .filter((row): row is LeadSearchResult => row !== null);
  }
}

function mapClassificationToResult(
  classification: PlaceClassification,
  sourceProvider: LeadSearchProviderId
): LeadSearchResult | null {
  if (classification.ok === false) {
    // Hard-rejected (no name, not operational, missing place_id) — skip,
    // never fabricate.
    return null;
  }

  const place =
    classification.ok === true ? classification.place : classification.place;
  const reasons =
    classification.ok === "incomplete" ? classification.reasons : [];

  const snippet = buildSnippet(place);

  return {
    title: place.name,
    url: place.website ?? "",
    snippet,
    sourceProvider,
    place,
    incomplete: classification.ok === "incomplete",
    incompleteReasons: reasons
  };
}

function buildSnippet(place: PlaceRecord): string {
  const parts = [
    place.formattedAddress,
    place.primaryType ? `type: ${place.primaryType}` : "",
    place.rating !== null ? `rating: ${place.rating}` : "",
    place.userRatingCount !== null ? `reviews: ${place.userRatingCount}` : ""
  ].filter(Boolean);
  return parts.join(" • ").slice(0, 400);
}

const FOOD_HINTS = [
  "restaurant",
  "restaurang",
  "café",
  "cafe",
  "bistro",
  "kafé",
  "matservering",
  "lunch",
  "bar"
];

function detectIncludedType(query: string): string | undefined {
  const q = query.toLowerCase();
  if (FOOD_HINTS.some((hint) => q.includes(hint))) {
    if (q.includes("café") || q.includes("cafe") || q.includes("kafé")) {
      return "cafe";
    }
    return "restaurant";
  }
  return undefined;
}

function logProviderError(err: PlacesError) {
  // Never include the API key. The error object already redacts on the way out,
  // but we double-guard here.
  console.warn(
    `[lead-search] google-places error code=${err.code} status=${err.status ?? "n/a"} message=${err.message}`
  );
}

export const supportedLeadSearchProviders: LeadSearchProviderId[] = [
  "google-places",
  "google-custom-search",
  "serpapi",
  "bing-web-search",
  "manual-csv"
];

/**
 * Accept "google" as an alias for "google-places" so the existing
 * `LEAD_SEARCH_PROVIDER=google` env value resolves correctly. Anything else
 * goes through the strict id list.
 */
function normalizeProviderId(value?: string): LeadSearchProviderId | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "google" || trimmed === "google-places" || trimmed === "places") {
    return "google-places";
  }
  return supportedLeadSearchProviders.includes(trimmed as LeadSearchProviderId)
    ? (trimmed as LeadSearchProviderId)
    : null;
}

function isProviderImplemented(id: LeadSearchProviderId | null): boolean {
  return id === "manual-csv" || id === "google-places";
}

export function getLeadSearchProviderStatus(): LeadSearchProviderStatus {
  const configuredProvider = process.env.LEAD_SEARCH_PROVIDER;
  const providerId = normalizeProviderId(configuredProvider);
  const providerImplemented = isProviderImplemented(providerId);
  const requiresApiKey = providerId !== null && providerId !== "manual-csv";
  const providerConfigured = Boolean(
    providerId && (providerId === "manual-csv" || process.env.LEAD_SEARCH_API_KEY)
  );
  const openAiConfigured = isOpenAiTextConfigured();
  const missing = [
    !process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : "",
    !process.env.OPENAI_MODEL ? "OPENAI_MODEL" : "",
    !configuredProvider ? "LEAD_SEARCH_PROVIDER" : "",
    configuredProvider && !providerId ? "SUPPORTED_LEAD_SEARCH_PROVIDER" : "",
    requiresApiKey && !process.env.LEAD_SEARCH_API_KEY ? "LEAD_SEARCH_API_KEY" : "",
    providerConfigured && !providerImplemented ? "PROVIDER_IMPLEMENTATION" : ""
  ].filter(Boolean);

  const message = buildStatusMessage({
    providerId,
    providerConfigured,
    providerImplemented,
    openAiConfigured
  });

  return {
    providerName: providerId ?? configuredProvider ?? "none",
    providerConfigured,
    providerImplemented,
    openAiConfigured,
    missing,
    supportedProviders: supportedLeadSearchProviders,
    message
  };
}

function buildStatusMessage(args: {
  providerId: LeadSearchProviderId | null;
  providerConfigured: boolean;
  providerImplemented: boolean;
  openAiConfigured: boolean;
}): string {
  const { providerId, providerConfigured, providerImplemented, openAiConfigured } =
    args;
  if (providerId === "manual-csv") {
    return "Manual CSV import is the only configured lead source. The system will not auto-discover companies.";
  }
  if (providerId === "google-places" && providerConfigured && openAiConfigured) {
    return "Google Places API is configured. Lead discovery is live (Sweden, restaurants/cafés).";
  }
  if (providerConfigured && !providerImplemented) {
    return "Provider credentials are present, but no live adapter is implemented for this provider id.";
  }
  if (!providerConfigured) {
    return "Live lead search needs a provider id and a real API key before discovery can run.";
  }
  if (!openAiConfigured) {
    return "Lead provider is configured, but OpenAI is not — scoring/personalization will be skipped.";
  }
  return "Lead search is partially configured.";
}

export function getLeadSearchProvider(): LeadSearchProvider | null {
  const status = getLeadSearchProviderStatus();

  if (
    !status.providerConfigured ||
    !status.openAiConfigured ||
    !status.providerImplemented
  ) {
    return null;
  }

  if (status.providerName === "manual-csv") {
    return new ManualCsvLeadSearchProvider();
  }
  if (status.providerName === "google-places") {
    return new GooglePlacesLeadSearchProvider();
  }
  return null;
}
