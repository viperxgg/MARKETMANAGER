import { z } from "zod";
import {
  getLeadSearchProvider,
  getLeadSearchProviderStatus,
  type LeadSearchResult
} from "@/lib/lead-search-provider";
import { isIntegrationEnabled } from "../flags";
import type { Integration, IntegrationCommand } from "../types";

/**
 * Lead-source integration. Wraps the existing lead-search-provider abstraction
 * so the same dispatch contract applies (audit log, feature flag, no approval
 * required because reads are safe).
 */

const searchSchema = z.object({
  productSlug: z.enum(["nord-smart-menu", "stadsync-ai"]),
  query: z.string().min(2).max(300),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const searchCompanies: IntegrationCommand<
  z.infer<typeof searchSchema>,
  { results: LeadSearchResult[] }
> = {
  id: "search_companies",
  description: "Search companies via the configured lead-search provider. Read-only.",
  schema: searchSchema,
  requiresApproval: false,
  async execute(input) {
    const provider = getLeadSearchProvider();
    if (!provider) {
      return { success: false, error: "Lead search provider not configured" };
    }
    const results = await provider.search({
      productSlug: input.productSlug,
      query: input.query,
      country: "SE",
      language: "sv",
      limit: input.limit
    });
    return { success: true, data: { results } };
  }
};

export const leadsIntegration: Integration = {
  id: "leads",
  description:
    "Lead search via configured external provider (Google Places API, manual CSV; legacy adapters: SerpAPI, Bing, Google CSE).",
  async status() {
    const provider = getLeadSearchProviderStatus();
    return {
      configured: provider.providerConfigured,
      enabled: isIntegrationEnabled("leads"),
      detail: `${provider.providerName} — implemented:${provider.providerImplemented}`,
      missingEnvVars: provider.providerConfigured ? [] : ["LEAD_SEARCH_PROVIDER", "LEAD_SEARCH_API_KEY"]
    };
  },
  commands: {
    [searchCompanies.id]: searchCompanies
  }
};
