import { prisma } from "./db";
import { getProduct, products, ProductSlug } from "./product-data";
import {
  AgencyBrainOutput,
  agencyBrainObjectiveSchema,
  agencyBrainOutputSchema,
  agencyBrainScopeSchema
} from "./validation";

export type AgencyBrainScope = "global" | ProductSlug;
export type AgencyBrainObjective =
  | "daily_review"
  | "campaign_idea"
  | "outreach_idea"
  | "social_idea"
  | "lead_research_direction"
  | "duplicate_check"
  | "messaging_review";

type RunAgencyBrainInput = {
  scope: AgencyBrainScope;
  objective: AgencyBrainObjective;
};

const objectiveLabels: Record<AgencyBrainObjective, string> = {
  daily_review: "Daily strategic recommendations",
  campaign_idea: "Campaign angle suggestions",
  outreach_idea: "Outreach draft ideas",
  social_idea: "Social post draft ideas",
  lead_research_direction: "Lead research direction",
  duplicate_check: "Duplicate-risk checking",
  messaging_review: "Product-specific messaging review"
};

function safeText(value: unknown, max = 280) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function markdownForOutput(output: AgencyBrainOutput) {
  return [
    `# Agency Brain: ${objectiveLabels[output.objective]}`,
    "",
    `Scope: ${output.scope}`,
    `Product: ${output.productSlug ?? "Global"}`,
    "",
    `Summary: ${output.summary}`,
    "",
    "## Reasoning",
    output.reasoning,
    "",
    "## Recommendations",
    ...output.recommendations.map((item, index) =>
      [
        `${index + 1}. ${item.title}`,
        `   - Type: ${item.type}`,
        `   - Channel: ${item.channel}`,
        `   - Audience: ${item.targetAudience}`,
        `   - خطر التكرار: ${item.duplicateRisk}`,
        `   - Similarity: ${item.similarityNotes}`,
        `   - Next step: ${item.nextStep}`,
        `   - Approval required: ${String(item.requiresApproval)}`,
        `   - Description: ${item.description}`
      ].join("\n")
    ),
    "",
    "## Memory Updates",
    ...(output.memoryUpdates.length > 0
      ? output.memoryUpdates.map((item) => `- ${item.title} (${item.confidence}%): ${item.content}`)
      : ["- No memory updates proposed."]),
    "",
    "## Warnings",
    ...(output.warnings.length > 0 ? output.warnings.map((warning) => `- ${warning}`) : ["- None."]),
    "",
    "## JSON",
    "```json",
    JSON.stringify(output, null, 2),
    "```"
  ].join("\n");
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

function scopeWhere(scope: AgencyBrainScope) {
  if (scope === "global") {
    return { productId: null };
  }

  return { product: { slug: scope } };
}

function productBoundaryText(scope: AgencyBrainScope) {
  if (scope === "global") {
    return [
      "Global scope is company-level Smart Art AI Solutions strategy only.",
      "Do not write product-specific recommendations unless the recommendation says to choose a product first.",
      `Available products: ${products.map((product) => product.name).join(", ")}.`
    ].join(" ");
  }

  const product = getProduct(scope);

  if (!product) {
    throw new Error("Unknown product scope.");
  }

  return [
    `Selected product: ${product.name}.`,
    `Product type: ${product.productType}.`,
    `Audience: ${product.audience}.`,
    `Positioning: ${product.positioning}.`,
    `Pain points: ${product.painPoints.join("; ")}.`,
    `Features: ${product.features.join("; ")}.`,
    `Preferred tone: ${product.preferredTone.join(", ")}.`,
    `Content angles: ${product.contentAngles.join("; ")}.`,
    "Never mix in another Smart Art AI Solutions product context."
  ].join("\n");
}

export async function loadAgencyBrainContext(input: RunAgencyBrainInput) {
  const scope = agencyBrainScopeSchema.parse(input.scope);
  const objective = agencyBrainObjectiveSchema.parse(input.objective);
  const where = scopeWhere(scope);
  const productRequiredWhere = { product: { slug: scope as ProductSlug } };

  const [
    memories,
    campaigns,
    outreachDrafts,
    socialDrafts,
    leads,
    approvalItems,
    reports
  ] = await Promise.all([
    prisma.agencyMemory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    scope === "global"
      ? Promise.resolve([])
      : prisma.campaign.findMany({
          where: productRequiredWhere,
          orderBy: { createdAt: "desc" },
          take: 10
        }),
    scope === "global"
      ? Promise.resolve([])
      : prisma.outreachDraft.findMany({
          where: productRequiredWhere,
          orderBy: { createdAt: "desc" },
          take: 10
        }),
    scope === "global"
      ? Promise.resolve([])
      : prisma.socialPostDraft.findMany({
          where: productRequiredWhere,
          orderBy: { createdAt: "desc" },
          take: 10
        }),
    scope === "global"
      ? Promise.resolve([])
      : prisma.lead.findMany({
          where: {
            product: { slug: scope },
            OR: [
              { lastContactedAt: { not: null } },
              { status: { in: ["contacted_manually", "responded", "converted", "closed"] } }
            ]
          },
          orderBy: { updatedAt: "desc" },
          take: 10
        }),
    prisma.approvalItem.findMany({
      where: {
        ...where,
        status: { in: ["approved_by_owner", "rejected", "needs_revision", "reviewed", "owner_review"] }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return {
    scope,
    objective,
    product: scope === "global" ? null : getProduct(scope),
    boundary: productBoundaryText(scope),
    duplicateSignals: {
      campaigns: campaigns.map((item) => ({
        name: item.name,
        angle: item.messageAngle,
        brief: safeText(item.brief)
      })),
      outreachDrafts: outreachDrafts.map((item) => ({
        subject: item.subject,
        company: item.company,
        bodyPreview: safeText(item.bodyPreview)
      })),
      socialDrafts: socialDrafts.map((item) => ({
        hook: item.hook,
        angle: item.campaignAngle,
        body: safeText(item.body)
      })),
      contactedLeads: leads.map((item) => ({
        companyName: item.companyName,
        status: item.status,
        entryAngle: item.bestEntryAngle
      })),
      memories: memories.map((item) => ({
        title: item.title,
        insight: safeText(item.insight),
        recommendation: safeText(item.recommendation)
      })),
      approvalHistory: approvalItems.map((item) => ({
        type: item.itemType,
        status: item.status,
        preview: safeText(item.contentPreview)
      })),
      reports: reports.map((item) => ({
        title: item.title,
        summary: safeText(item.summary),
        recommendations: item.recommendations.slice(0, 4)
      }))
    }
  };
}

function buildPrompt(context: Awaited<ReturnType<typeof loadAgencyBrainContext>>) {
  return [
    "You are Agency Brain for Smart Art AI Solutions.",
    "You suggest, draft, compare, and learn. You never send emails, publish posts, contact customers, scrape personal emails, or approve execution.",
    "All external actions require manual owner approval. Set requiresApproval=true for every recommendation that could become external-facing.",
    "",
    "Scope and product context:",
    context.boundary,
    "",
    `Objective: ${context.objective} (${objectiveLabels[context.objective]}).`,
    "",
    "Duplicate prevention context:",
    JSON.stringify(context.duplicateSignals, null, 2),
    "",
    "Return only valid JSON with this exact shape:",
    JSON.stringify({
      scope: context.scope,
      productSlug: context.scope === "global" ? null : context.scope,
      objective: context.objective,
      summary: "string",
      reasoning: "string",
      recommendations: [
        {
          type: "string",
          title: "string",
          description: "string",
          targetAudience: "string",
          channel: "string",
          duplicateRisk: "low | medium | high",
          similarityNotes: "string",
          nextStep: "create_new | revise_existing | skip",
          requiresApproval: true
        }
      ],
      memoryUpdates: [
        {
          type: "string",
          title: "string",
          content: "string",
          confidence: 80
        }
      ],
      warnings: ["string"]
    }),
    "",
    "Keep recommendations concise, practical, product-specific, and duplicate-aware."
  ].join("\n");
}

async function callOpenAiForAgencyBrain(context: Awaited<ReturnType<typeof loadAgencyBrainContext>>) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a careful B2B marketing strategy assistant. Return JSON only. Never suggest automatic sending, publishing, or customer contact."
        },
        {
          role: "user",
          content: buildPrompt(context)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed.");
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include content.");
  }

  return agencyBrainOutputSchema.parse(parseJsonObject(content));
}

function fallbackOutput(context: Awaited<ReturnType<typeof loadAgencyBrainContext>>): AgencyBrainOutput {
  const productName = context.product?.name ?? "Smart Art AI Solutions";
  const duplicateRisk = context.duplicateSignals.campaigns.length > 0 ? "medium" : "low";

  return agencyBrainOutputSchema.parse({
    scope: context.scope,
    productSlug: context.scope === "global" ? null : context.scope,
    objective: context.objective,
    summary:
      "OPENAI_API_KEY is not configured, so Agency Brain created a local safety-first planning stub instead of calling the AI model.",
    reasoning:
      "The recommendation is intentionally conservative. Configure OPENAI_API_KEY to enable model-based reasoning over product context, memory, and duplicate signals.",
    recommendations: [
      {
        type: "configuration",
        title: `Enable Agency Brain AI for ${productName}`,
        description:
          "Add OPENAI_API_KEY on the server environment, then rerun this objective to receive model-generated strategy with duplicate-risk analysis.",
        targetAudience: context.scope === "global" ? "Smart Art AI Solutions" : context.product?.audience ?? productName,
        channel: "internal",
        duplicateRisk,
        similarityNotes:
          "Local duplicate check reviewed stored campaigns, drafts, leads, memories, approvals, and reports but did not call the AI model.",
        nextStep: "revise_existing",
        requiresApproval: true
      }
    ],
    memoryUpdates: [
      {
        type: "system_readiness",
        title: "Agency Brain requires server-side OpenAI configuration",
        content:
          "Agency Brain is wired to use OPENAI_API_KEY from the server environment and keeps all recommendations approval-gated.",
        confidence: 95
      }
    ],
    warnings: [
      "OPENAI_API_KEY is missing. No API key was exposed or logged.",
      "No external action was executed."
    ]
  });
}

export async function runAgencyBrain(input: RunAgencyBrainInput) {
  const context = await loadAgencyBrainContext(input);
  let output: AgencyBrainOutput;

  try {
    output = await callOpenAiForAgencyBrain(context);
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_API_KEY is not configured.") {
      output = fallbackOutput(context);
    } else {
      throw error;
    }
  }

  const productRecord =
    output.productSlug === null
      ? null
      : await prisma.product.findUnique({
          where: { slug: output.productSlug }
        });

  const report = await prisma.report.create({
    data: {
      productId: productRecord?.id,
      type: "monthly_learning_report",
      title: `Agency Brain - ${objectiveLabels[output.objective]}`,
      summary: output.summary,
      whatWasDone: [
        "Loaded selected product or global context.",
        "Loaded memory, campaign, draft, lead, approval, and report history.",
        "Validated structured Agency Brain output with Zod."
      ],
      numbers: {
        recommendations: output.recommendations.length,
        memoryUpdates: output.memoryUpdates.length,
        highDuplicateRisk: output.recommendations.filter((item) => item.duplicateRisk === "high").length
      },
      whatWorked: output.recommendations.map((item) => `${item.title}: خطر التكرار ${item.duplicateRisk}`),
      whatDidNotWork: output.warnings,
      recommendations: output.recommendations.map((item) => item.nextStep),
      nextWeekPlan: output.recommendations.map((item) => item.title),
      markdown: markdownForOutput(output),
      status: "draft",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `agency_brain:${output.scope}:${output.objective}`
    }
  });

  for (const recommendation of output.recommendations) {
    if (!recommendation.requiresApproval) {
      continue;
    }

    await prisma.approvalItem.create({
      data: {
        productId: productRecord?.id,
        itemType: "agency_brain_recommendation",
        itemId: report.id,
        contentPreview: `${recommendation.title} (خطر التكرار: ${recommendation.duplicateRisk}): ${recommendation.description}`,
        riskWarnings: [
          `duplicate_risk: ${recommendation.duplicateRisk}`,
          `recommended_action: ${recommendation.nextStep}`,
          "لا يوجد إرسال أو نشر تلقائي"
        ],
        complianceChecklist: [
          "تم التحقق من الخرج المنظم عبر Zod",
          "موافقة المالك اليدوية مطلوبة",
          "لم يتم تنفيذ أي إجراء خارجي"
        ],
        finalStatus: "manual_execution_required",
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: recommendation.similarityNotes
      }
    });
  }

  for (const memory of output.memoryUpdates) {
    await prisma.agencyMemory.create({
      data: {
        productId: productRecord?.id,
        title: memory.title,
        category: "market_insights",
        source: "agency_brain",
        confidence: memory.confidence,
        insight: memory.content,
        recommendation: `Review before using in future drafts. Type: ${memory.type}`,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: `agency_brain:${report.id}`
      }
    });
  }

  return { output, reportId: report.id };
}

export async function getAgencyBrainRuns() {
  return prisma.report.findMany({
    where: {
      notes: {
        startsWith: "agency_brain:"
      }
    },
    include: {
      product: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });
}
