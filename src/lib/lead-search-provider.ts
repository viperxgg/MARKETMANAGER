import { ProductSlug } from "./product-data";
import { isOpenAiTextConfigured } from "./openai-config";

export type LeadSearchProviderId =
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

export type LeadSearchResult = {
  title: string;
  url: string;
  snippet: string;
  sourceProvider: LeadSearchProviderId;
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
  name = "استيراد CSV يدوي";

  status() {
    return getLeadSearchProviderStatus();
  }

  async search() {
    return [];
  }
}

export const supportedLeadSearchProviders: LeadSearchProviderId[] = [
  "google-custom-search",
  "serpapi",
  "bing-web-search",
  "manual-csv"
];

function normalizeProviderId(value?: string): LeadSearchProviderId | null {
  if (!value) {
    return null;
  }

  return supportedLeadSearchProviders.includes(value as LeadSearchProviderId)
    ? (value as LeadSearchProviderId)
    : null;
}

export function getLeadSearchProviderStatus(): LeadSearchProviderStatus {
  const configuredProvider = process.env.LEAD_SEARCH_PROVIDER;
  const providerId = normalizeProviderId(configuredProvider);
  const providerImplemented = providerId === "manual-csv";
  const providerConfigured = Boolean(
    providerId && (providerId === "manual-csv" || process.env.LEAD_SEARCH_API_KEY)
  );
  const openAiConfigured = isOpenAiTextConfigured();
  const missing = [
    !process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : "",
    !process.env.OPENAI_MODEL ? "OPENAI_MODEL" : "",
    !configuredProvider ? "LEAD_SEARCH_PROVIDER" : "",
    configuredProvider && !providerId ? "SUPPORTED_LEAD_SEARCH_PROVIDER" : "",
    providerId && providerId !== "manual-csv" && !process.env.LEAD_SEARCH_API_KEY
      ? "LEAD_SEARCH_API_KEY"
      : "",
    providerConfigured && !providerImplemented ? "PROVIDER_IMPLEMENTATION" : ""
  ].filter(Boolean);

  return {
    providerName: providerId ?? configuredProvider ?? "none",
    providerConfigured,
    providerImplemented,
    openAiConfigured,
    missing,
    supportedProviders: supportedLeadSearchProviders,
    message:
      providerId === "manual-csv"
        ? "استيراد CSV اليدوي متاح كأول مصدر حقيقي للعملاء. لا يكتشف الشركات بنفسه."
        : providerConfigured && openAiConfigured
        ? "بيانات المزوّد موجودة، لكن لا يوجد محوّل بحث حي مطبّق بعد. لن يتم تشغيل بحث العملاء."
        : "بحث العملاء الحي يحتاج OpenAI ومزوّد بحث حقيقي قبل اكتشاف الشركات."
  };
}

export function getLeadSearchProvider(): LeadSearchProvider | null {
  const status = getLeadSearchProviderStatus();

  if (!status.providerConfigured || !status.openAiConfigured || !status.providerImplemented) {
    return null;
  }

  if (status.providerName === "manual-csv") {
    return new ManualCsvLeadSearchProvider();
  }

  return null;
}
