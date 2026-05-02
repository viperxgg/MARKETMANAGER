import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ensureProductRecord } from "./data-service";
import {
  getLeadSearchProvider,
  getLeadSearchProviderStatus,
  LeadSearchProviderStatus,
  LeadSearchResult
} from "./lead-search-provider";
import type { PlaceRecord } from "./google-places";

/**
 * Enriched candidate type — what `enrichSearchResults` returns. Carries the
 * structured `place` object end-to-end so place metadata can be persisted
 * onto the Lead row at save time. `place` is undefined for non-Places
 * providers (manual CSV, legacy stubs).
 */
type EnrichedCandidate = LeadSearchResult & {
  domain: string;
  officialEmail: string | undefined;
  pageText: string;
};

/** Subset of place metadata persisted on the Lead row. */
type LeadPlaceMeta = {
  sourceProvider?: string;
  place?: PlaceRecord;
  incomplete?: boolean;
  incompleteReasons?: string[];
};
import { completeJsonViaDispatch } from "./integrations/openai/helpers";
import { getOpenAiTextConfig } from "./openai-config";
import { getProduct, ProductSlug } from "./product-data";
import {
  LiveLeadResearchLead,
  LiveLeadResearchOutput,
  liveLeadResearchOutputSchema,
  productSlugSchema
} from "./validation";

export type LiveLeadResearchCard = LiveLeadResearchLead & {
  leadId: string | null;
  outreachDraftId: string | null;
  approvalId: string | null;
  saved: boolean;
  recommendedAction: "save_for_review" | "skip_duplicate";
};

export type LiveLeadResearchResult =
  | {
      status: "missing_configuration";
      productSlug: ProductSlug;
      productName: string;
      providerStatus: LeadSearchProviderStatus;
      missing: string[];
      steps: string[];
      message: string;
    }
  | {
      status: "completed";
      productSlug: ProductSlug;
      productName: string;
      providerStatus: LeadSearchProviderStatus;
      summary: string;
      outreachLearning: string;
      leads: LiveLeadResearchCard[];
      warnings: string[];
      steps: string[];
    };

const notesPrefix = "live_lead_research:";

const forbiddenTermsByProduct: Record<ProductSlug, string[]> = {
  "nord-smart-menu": [
    "cleaning",
    "cleaning company",
    "cleaning companies",
    "cleaning operations",
    "rut",
    "städ",
    "städning",
    "städfirma",
    "städteam",
    "worker checklist",
    "workers",
    "checklists"
  ],
  "stadsync-ai": [
    "qr menu",
    "qr-meny",
    "digital menu",
    "restaurant",
    "restaurants",
    "restaurang",
    "waiter",
    "waiters",
    "kitchen flow",
    "kitchen",
    "alcohol",
    "food ordering",
    "menu ordering",
    "mobile ordering"
  ]
};

const searchQueries: Record<ProductSlug, string[]> = {
  "nord-smart-menu": [
    "ny restaurang Sverige kontakt email meny",
    "cafe Sverige kontakt digital meny",
    "bar restaurang Sverige kontakt boka bord meny"
  ],
  "stadsync-ai": [
    "ny städfirma Sverige kontakt email RUT",
    "städföretag Sverige kontakt hemstädning RUT",
    "städbolag Sverige kontakt kvalitet RUT"
  ]
};

const steps = [
  "Loading product context",
  "Checking previous contacts",
  "Searching market",
  "Scoring leads",
  "Drafting personalized emails",
  "Saving results for review"
];

function safeText(value: unknown, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function rootDomain(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    const parts = host.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : host;
  } catch {
    return "";
  }
}

function normalizeCompanyName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9åäö]/gi, "");
}

function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function assertProductSeparation(output: LiveLeadResearchOutput) {
  const text = JSON.stringify(output).toLowerCase();
  const blocked = forbiddenTermsByProduct[output.productSlug].filter((term) =>
    text.includes(term.toLowerCase())
  );

  if (blocked.length > 0) {
    throw new Error(`Product context leakage detected: ${blocked.join(", ")}`);
  }
}

async function fetchOfficialPage(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Smart Art AI Solutions lead research bot; manual review only"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  } catch {
    return "";
  }
}

function extractOfficialEmail(html: string, website: string) {
  const domain = rootDomain(website);
  const matches = Array.from(
    new Set(
      (html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
        .map((email) => email.toLowerCase())
        .filter((email) => !email.includes("example."))
    )
  );

  return matches.find((email) => email.endsWith(`@${domain}`) || email.split("@")[1]?.endsWith(`.${domain}`));
}

async function enrichSearchResults(results: LeadSearchResult[]) {
  const unique = Array.from(
    new Map(
      results
        .filter((item) => item.url.startsWith("http"))
        .map((item) => [rootDomain(item.url) || item.url, item])
    ).values()
  ).slice(0, 12);

  const enriched = await Promise.all(
    unique.map(async (item) => {
      const html = await fetchOfficialPage(item.url);
      const email = extractOfficialEmail(html, item.url);

      return {
        ...item,
        domain: rootDomain(item.url),
        officialEmail: email,
        pageText: safeText(html.replace(/<[^>]+>/g, " "), 1200)
      };
    })
  );

  return enriched.filter((item) => item.officialEmail);
}

async function loadResearchContext(productSlug: ProductSlug) {
  const product = getProduct(productSlug);

  if (!product) {
    throw new Error("Unknown product.");
  }

  const productRecord = await ensureProductRecord(productSlug);

  if (!productRecord) {
    throw new Error("Product record not available.");
  }

  const [leads, outreachDrafts, memories, approvals] = await Promise.all([
    prisma.lead.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    prisma.outreachDraft.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 30
    }),
    prisma.agencyMemory.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 12
    }),
    prisma.approvalItem.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 30
    })
  ]);

  return {
    product,
    productRecord,
    existing: {
      leads: leads.map((lead) => ({
        id: lead.id,
        companyName: lead.companyName,
        domain: rootDomain(lead.website),
        email: lead.officialEmail,
        status: lead.status,
        fitScore: lead.fitScore,
        contacted: Boolean(lead.lastContactedAt || lead.status === "contacted_manually")
      })),
      rejectedLeads: leads
        .filter((lead) => lead.status === "not_relevant" || lead.notes.includes("rejected"))
        .map((lead) => ({
          companyName: lead.companyName,
          domain: rootDomain(lead.website),
          reason: safeText(lead.notes)
        })),
      outreachDrafts: outreachDrafts.map((draft) => ({
        company: draft.company,
        subject: draft.subject,
        status: draft.status,
        bodyPreview: safeText(draft.bodyPreview),
        notes: safeText(draft.notes)
      })),
      memories: memories.map((memory) => ({
        title: memory.title,
        confidence: memory.confidence,
        insight: safeText(memory.insight),
        recommendation: safeText(memory.recommendation)
      })),
      approvalHistory: approvals.map((approval) => ({
        type: approval.itemType,
        status: approval.status,
        preview: safeText(approval.contentPreview),
        warnings: approval.riskWarnings.slice(0, 4)
      }))
    }
  };
}

function buildPrompt(
  context: Awaited<ReturnType<typeof loadResearchContext>>,
  candidates: Awaited<ReturnType<typeof enrichSearchResults>>
) {
  const { product } = context;

  return [
    "You are a product-specific real-time lead research analyst for Smart Art AI Solutions.",
    "You only suggest leads for the selected product. Never mix product contexts.",
    "You never send emails, contact companies, approve outreach, or imply external action happened.",
    "Use only candidate companies and official emails provided below. Do not invent companies, websites, or emails.",
    "Return JSON only.",
    "",
    "Selected product context:",
    `Product slug: ${product.slug}`,
    `Name: ${product.name}`,
    `Product type: ${product.productType}`,
    `Audience: ${product.audience}`,
    `Positioning: ${product.positioning}`,
    `Pain points: ${product.painPoints.join("; ")}`,
    `Features: ${product.features.join("; ")}`,
    `Preferred tone: ${product.preferredTone.join(", ")}`,
    `Lead criteria: ${product.leadCriteria.join("; ")}`,
    `Allowed angles: ${product.contentAngles.join("; ")}`,
    `Forbidden topics: ${forbiddenTermsByProduct[product.slug].join("; ")}`,
    "",
    "Previous outreach, rejected leads, duplicate signals, and memory:",
    JSON.stringify(context.existing, null, 2),
    "",
    "Real-time candidates with official-domain emails found from public pages:",
    JSON.stringify(candidates, null, 2),
    "",
    "Scoring rules:",
    "- Include only fitScore >= 80.",
    "- Prefer small or medium Swedish companies likely able to pay.",
    "- Avoid huge chains, national enterprise-scale companies, irrelevant businesses, already stored leads, contacted companies, and high duplicate-risk companies.",
    "- Proposed email must be Swedish, calm, respectful, personalized, and product-specific.",
    "- Do not shame the company or imply their current operation is bad.",
    "",
    "Return only valid JSON with this exact shape:",
    JSON.stringify({
      productSlug: product.slug,
      summary: "string",
      outreachLearning: "string",
      leads: [
        {
          companyName: "string",
          website: "https://official-company-site.se",
          officialEmail: "info@official-company-site.se",
          emailSource: "https://official-company-site.se/contact",
          productSlug: product.slug,
          fitScore: 80,
          acceptanceLikelihood: 50,
          companySizeEstimate: "small | medium with short reasoning",
          isNewOrRecentlyStarted: false,
          reasonForSelection: "string",
          whyTheyMightPay: "string",
          visiblePainPoints: ["string"],
          personalizationNotes: "string",
          proposedEmailSubject: "string",
          proposedEmailBody: "string",
          duplicateRisk: "low | medium | high",
          contactStatus: "not_contacted",
          warnings: ["string"]
        }
      ],
      warnings: ["string"]
    })
  ].join("\n");
}

async function callOpenAiForLeadResearch(
  context: Awaited<ReturnType<typeof loadResearchContext>>,
  candidates: Awaited<ReturnType<typeof enrichSearchResults>>
) {
  // Asserts text config is present and surfaces openAiTextConfigurationError if not.
  getOpenAiTextConfig();

  const text = await completeJsonViaDispatch({
    system:
      "You are a careful Swedish B2B lead researcher. Return JSON only. Never invent leads or emails. Never send or approve outreach.",
    user: buildPrompt(context, candidates),
    temperature: 0.2
  });

  return liveLeadResearchOutputSchema.parse(parseJsonObject(text));
}

function withDuplicateRisk(
  lead: LiveLeadResearchLead,
  context: Awaited<ReturnType<typeof loadResearchContext>>
) {
  const leadDomain = rootDomain(lead.website);
  const normalized = normalizeCompanyName(lead.companyName);
  const duplicate = context.existing.leads.find((existing) => {
    const sameDomain = existing.domain && existing.domain === leadDomain;
    const sameEmail = existing.email && existing.email.toLowerCase() === lead.officialEmail.toLowerCase();
    const sameName = normalizeCompanyName(existing.companyName) === normalized;
    return sameDomain || sameEmail || sameName;
  });

  if (!duplicate) {
    return lead;
  }

  return {
    ...lead,
    duplicateRisk: "high" as const,
    contactStatus: duplicate.contacted ? "already_contacted" : "already_stored",
    warnings: [
      ...lead.warnings,
      `Duplicate detected against existing lead ${duplicate.companyName}. Recommended action: skip.`
    ].slice(0, 10)
  };
}

async function saveLeadForReview(
  lead: LiveLeadResearchLead,
  context: Awaited<ReturnType<typeof loadResearchContext>>,
  placeMeta?: LeadPlaceMeta
) {
  const notes = `${notesPrefix}${JSON.stringify(lead)}`;
  const place = placeMeta?.place;
  const placeTags: string[] = [];
  if (placeMeta?.sourceProvider) {
    placeTags.push(`source:${placeMeta.sourceProvider}`);
  }
  if (placeMeta?.incomplete) {
    placeTags.push("incomplete_lead");
    for (const reason of placeMeta.incompleteReasons ?? []) {
      placeTags.push(`missing:${reason.replace(/^missing_/, "")}`);
    }
  }

  const leadRecord = await prisma.lead.create({
    data: {
      productId: context.productRecord.id,
      companyName: lead.companyName,
      website: lead.website,
      city: "Sweden",
      country: "Sweden",
      industry: context.product.productType,
      segment: lead.companySizeEstimate,
      sourceUrl: lead.website,
      fitScore: lead.fitScore,
      confidenceLevel: lead.fitScore >= 90 ? "high" : "medium",
      reasonForFit: lead.reasonForSelection,
      officialEmail: lead.officialEmail,
      emailSourceUrl: lead.emailSource,
      emailConfidence: "high",
      contactStatus: "not_contacted",
      tags: [
        "live-lead-research",
        context.product.slug,
        lead.duplicateRisk,
        ...placeTags
      ],
      bestEntryAngle: lead.whyTheyMightPay,
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes,
      // ─── Place metadata (additive, all optional) ───────────────────────
      sourceProvider: placeMeta?.sourceProvider ?? null,
      sourceMetadata: place ? (place as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      googlePlaceId: place?.placeId ?? null,
      phone: place?.phone ?? null,
      address: place?.formattedAddress ?? null,
      googleMapsUrl: place?.googleMapsUri ?? null,
      googleRating: place?.rating ?? null,
      userRatingCount: place?.userRatingCount ?? null,
      businessStatus: place?.businessStatus ?? null
    }
  });

  const outreachDraft = await prisma.outreachDraft.create({
    data: {
      productId: context.productRecord.id,
      leadId: leadRecord.id,
      company: lead.companyName,
      subject: lead.proposedEmailSubject,
      opening: lead.personalizationNotes,
      observation: lead.visiblePainPoints.join("; "),
      opportunity: lead.whyTheyMightPay,
      productConnection: `${context.product.name}: ${context.product.positioning}`,
      softCta: context.product.cta,
      closing: "Vänliga hälsningar, Smart Art AI Solutions",
      language: "sv",
      tone: context.product.preferredTone.join(", "),
      complianceChecklist: [
        "تم تسجيل مصدر البريد الرسمي",
        "لا يوجد إرسال تلقائي",
        "موافقة المالك مطلوبة",
        "تم فحص الرسائل الخاصة بالمنتج"
      ],
      bodyPreview: lead.proposedEmailBody,
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes
    }
  });

  const approval = await prisma.approvalItem.create({
    data: {
      productId: context.productRecord.id,
      leadId: leadRecord.id,
      itemType: "live_lead_research_outreach",
      itemId: outreachDraft.id,
      contentPreview: `${lead.companyName}: ${lead.proposedEmailSubject} (ملاءمة ${lead.fitScore}%، خطر التكرار: ${lead.duplicateRisk})`,
      riskWarnings: [
        `duplicate_risk: ${lead.duplicateRisk}`,
        `acceptance_likelihood: ${lead.acceptanceLikelihood}%`,
        "لا يوجد إرسال تلقائي",
        ...lead.warnings
      ].slice(0, 10),
      complianceChecklist: [
        "مصدر البريد الرسمي مطلوب",
        "مسودة بريد سويدية مخصصة",
        "موافقة المالك اليدوية مطلوبة",
        "approved_by_owner ما زال false"
      ],
      finalStatus: "manual_execution_required",
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `${notesPrefix}${leadRecord.id}`
    }
  });

  return {
    leadId: leadRecord.id,
    outreachDraftId: outreachDraft.id,
    approvalId: approval.id
  };
}

export async function runLiveLeadResearch(productSlugInput: string): Promise<LiveLeadResearchResult> {
  const productSlug = productSlugSchema.parse(productSlugInput);
  const product = getProduct(productSlug);

  if (!product) {
    throw new Error("Unknown product.");
  }

  const providerStatus = getLeadSearchProviderStatus();
  const provider = getLeadSearchProvider();

  if (!provider) {
    return {
      status: "missing_configuration",
      productSlug,
      productName: product.name,
      providerStatus,
      missing: providerStatus.missing,
      steps,
      message: `${providerStatus.message} No fake leads were created.`
    };
  }

  const context = await loadResearchContext(productSlug);
  const searchResults = (
    await Promise.all(
      searchQueries[productSlug].map((query) =>
        provider.search({
          productSlug,
          query,
          country: "SE",
          language: "sv",
          limit: 10
        })
      )
    )
  ).flat();
  const candidates = await enrichSearchResults(searchResults);
  const candidateByDomain = new Map<string, EnrichedCandidate>(
    candidates.map((c) => [c.domain, c as EnrichedCandidate])
  );

  if (candidates.length === 0) {
    return {
      status: "completed",
      productSlug,
      productName: product.name,
      providerStatus,
      summary: "No verified official-domain emails were found from the live search results.",
      outreachLearning:
        "The run stopped before AI scoring because no official company email could be verified from public pages.",
      leads: [],
      warnings: [
        "No leads were saved.",
        "Try a different lead search provider or broader search provider configuration."
      ],
      steps
    };
  }

  let output = await callOpenAiForLeadResearch(context, candidates);
  output = liveLeadResearchOutputSchema.parse({
    ...output,
    productSlug,
    leads: output.leads.map((lead) => ({
      ...lead,
      productSlug
    }))
  });
  assertProductSeparation(output);

  const leadCards: LiveLeadResearchCard[] = [];
  const seenInRun = new Set<string>();

  for (const rawLead of output.leads) {
    let lead = withDuplicateRisk(rawLead, context);
    const runKeys = [
      rootDomain(lead.website),
      normalizeCompanyName(lead.companyName),
      lead.officialEmail.toLowerCase()
    ].filter(Boolean);
    const duplicateInRun = runKeys.some((key) => seenInRun.has(key));

    if (duplicateInRun) {
      lead = {
        ...lead,
        duplicateRisk: "high",
        contactStatus: "duplicate_in_current_run",
        warnings: [
          ...lead.warnings,
          "Duplicate detected inside this live research run. Recommended action: skip."
        ].slice(0, 10)
      };
    }

    assertProductSeparation(
      liveLeadResearchOutputSchema.parse({
        ...output,
        leads: [lead]
      })
    );

    if (lead.duplicateRisk === "high") {
      leadCards.push({
        ...lead,
        leadId: null,
        outreachDraftId: null,
        approvalId: null,
        saved: false,
        recommendedAction: "skip_duplicate"
      });
      continue;
    }

    const matchedCandidate = candidateByDomain.get(rootDomain(lead.website));
    const placeMeta: LeadPlaceMeta | undefined = matchedCandidate
      ? {
          sourceProvider: matchedCandidate.sourceProvider,
          place: matchedCandidate.place,
          incomplete: matchedCandidate.incomplete,
          incompleteReasons: matchedCandidate.incompleteReasons
        }
      : undefined;
    const saved = await saveLeadForReview(lead, context, placeMeta);
    runKeys.forEach((key) => seenInRun.add(key));
    leadCards.push({
      ...lead,
      ...saved,
      saved: true,
      recommendedAction: "save_for_review"
    });
  }

  return {
    status: "completed",
    productSlug,
    productName: product.name,
    providerStatus,
    summary: output.summary,
    outreachLearning: output.outreachLearning,
    leads: leadCards,
    warnings: output.warnings,
    steps
  };
}
