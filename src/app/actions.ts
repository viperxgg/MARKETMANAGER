"use server";

import { redirect } from "next/navigation";
import { dismissCard, restoreDismissedCard } from "@/lib/dismissals";
import { generateFacebookImageAsset } from "@/lib/facebook-image-assets";
import { runAgencyBrain } from "@/lib/agency-brain";
import { generateFacebookPostForProduct } from "@/lib/content-studio";
import { buildDailySummary, buildLeadResearchBrief, buildPostDraft } from "@/lib/daily-engine";
import { hasDatabaseUrl, prisma } from "@/lib/db";
import { ensureProductRecord } from "@/lib/data-service";
import { importManualCsvLeads } from "@/lib/manual-csv-leads";
import { openAiTextConfigurationError } from "@/lib/openai-config";
import { getProduct, products } from "@/lib/product-data";
import { publishToFacebook } from "@/services/facebook-publisher";
import {
  approveAndPublishFacebookSchema,
  campaignBriefSchema,
  agencyBrainRunSchema,
  approvalDecisionSchema,
  contactVerificationSchema,
  dismissCardSchema,
  experimentSchema,
  generateFacebookImageSchema,
  importLeadSchema,
  leadResearchSchema,
  manualMetricSchema,
  memorySchema,
  outreachDraftSchema,
  reportSchema,
  runTodaySchema,
  socialDraftSchema,
  websiteAnalysisSchema,
  writePostSchema
} from "@/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function notice(path: string, code: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}notice=${code}`);
}

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function splitList(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReportMarkdown(input: {
  title: string;
  summary: string;
  whatWasDone: string[];
  whatWorked: string[];
  whatDidNotWork: string[];
  recommendations: string[];
  nextWeekPlan: string[];
}) {
  const section = (title: string, items: string[]) =>
    [`## ${title}`, ...(items.length > 0 ? items.map((item) => `- ${item}`) : ["- Not recorded yet."])].join("\n");

  return [
    `# ${input.title}`,
    "",
    `Summary: ${input.summary}`,
    "",
    section("What was done", input.whatWasDone),
    "",
    section("What worked", input.whatWorked),
    "",
    section("What did not work", input.whatDidNotWork),
    "",
    section("Recommendations", input.recommendations),
    "",
    section("Next week plan", input.nextWeekPlan)
  ].join("\n");
}

async function ensureBalancedProductExamples() {
  for (const product of products) {
    const productRecord = await ensureProductRecord(product.slug);

    if (!productRecord) {
      continue;
    }

    const existingSample = await prisma.campaign.findFirst({
      where: {
        productId: productRecord.id,
        notes: "Balanced product context sample."
      }
    });

    if (existingSample) {
      continue;
    }

    const campaign = await prisma.campaign.create({
      data: {
        productId: productRecord.id,
        name: `${product.name} product-context sample campaign`,
        targetSegment: product.sampleSegments[0],
        objective: `Validate interest in ${product.contentAngles[0]} for ${product.audience}.`,
        channel: "manual",
        hypothesis: `${product.sampleSegments[0]} respond to ${product.contentAngles[0]} when the message stays product-specific.`,
        successMetrics: ["manual review quality", "qualified lead fit", "owner-approved next step"],
        messageAngle: product.contentAngles[0],
        brief: [
          `Product: ${product.name}`,
          `Audience: ${product.audience}`,
          `Positioning: ${product.positioning}`,
          `Use: ${product.contentAngles.join("; ")}`,
          "Boundary: stay inside this selected product context and do not borrow another product's claims or examples.",
          "No live sending. No live publishing. Manual approval required."
        ].join("\n"),
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Balanced product context sample."
      }
    });

    const socialDraft = await prisma.socialPostDraft.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        platform: "linkedin",
        campaignAngle: product.contentAngles[0],
        audience: product.audience,
        postType: "educational",
        hook: product.contentAngles[0],
        body: `${product.name} example draft: ${product.positioning} Focus only on ${product.name}; do not mix contexts with other Smart Art AI Solutions products.`,
        cta: product.cta,
        hashtags: product.socialHashtags,
        imageConcept: `Product-specific visual for ${product.name}`,
        imagePromptEn: `Premium Scandinavian B2B visual for ${product.name}. Show ${product.contentAngles
          .slice(0, 2)
          .join(" and ")}. Keep all details scoped to this selected product.`,
        visualAvoid: ["cross-product claims", "unsupported outcomes", "fake customer logos"],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Balanced product context sample."
      }
    });

    await prisma.agencyMemory.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        title: `${product.name} context boundary`,
        category: "compliance_lessons",
        source: "balanced_seed",
        confidence: 90,
        insight: `${product.name} content must stay inside its own product context: ${product.contentAngles.join(", ")}.`,
        recommendation: `Before drafting, load ${product.name} context and keep the draft inside that selected product scope.`,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Balanced product context sample."
      }
    });

    const report = await prisma.report.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        type: "product_positioning_report",
        title: `${product.name} positioning sample report`,
        summary: `${product.name} is tracked as an independent product with separate audience, angles, and forbidden messaging.`,
        whatWasDone: ["Created balanced product context sample records."],
        numbers: { sampleRecordsCreated: 4 },
        whatWorked: [`${product.name} has a clear product-specific scope.`],
        whatDidNotWork: [],
        recommendations: [`Keep ${product.name} separate from other product messaging.`],
        nextWeekPlan: [`Create one real campaign using ${product.contentAngles[0]}.`],
        markdown: buildReportMarkdown({
          title: `${product.name} positioning sample report`,
          summary: `${product.name} is tracked as an independent product with separate audience, angles, and forbidden messaging.`,
          whatWasDone: ["Created balanced product context sample records."],
          whatWorked: [`${product.name} has a clear product-specific scope.`],
          whatDidNotWork: [],
          recommendations: [`Keep ${product.name} separate from other product messaging.`],
          nextWeekPlan: [`Create one real campaign using ${product.contentAngles[0]}.`]
        }),
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Balanced product context sample."
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        itemType: "balanced_product_context_sample",
        itemId: socialDraft.id,
        contentPreview: `${product.name} sample draft and report are ready for owner review.`,
        riskWarnings: ["Product context must not be mixed", "Manual execution required"],
        complianceChecklist: [
          "Selected product context loaded",
          "Forbidden messaging checked",
          "approved_by_owner remains false"
        ],
        finalStatus: "manual_execution_required",
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: `Related report: ${report.id}`
      }
    });
  }
}

export async function runTodayAction(formData: FormData) {
  const parsed = runTodaySchema.safeParse({
    productSlug: getString(formData, "productSlug")
  });

  if (!parsed.success) {
    notice("/", "invalid");
  }

  const daily = buildDailySummary();

  if (!hasDatabaseUrl()) {
    notice("/", "db-missing");
  }

  try {
    const productRecord = parsed.data.productSlug
      ? await ensureProductRecord(parsed.data.productSlug)
      : null;

    await prisma.dailyRun.create({
      data: {
        productId: productRecord?.id,
        summary: daily.summary,
        recommendedActions: daily.recommendations,
        contentNeeded: true,
        leadsNeeded: true,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        warnings: ["Live sending and publishing are disabled."]
      }
    });

    await prisma.agencyMemory.create({
      data: {
        productId: productRecord?.id,
        title: "Daily review completed",
        category: "compliance_lessons",
        source: "daily_run",
        insight:
          "A daily analysis run was created. Review manual metrics before approving new outreach or social content.",
        recommendation:
          "Use manual tracking and approval review before creating any external-facing campaign material.",
        confidence: 80,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice("/", "db-error");
  }

  notice("/", "daily-run-created");
}

export async function runAgencyBrainAction(formData: FormData) {
  const parsed = agencyBrainRunSchema.safeParse({
    scope: getString(formData, "scope"),
    objective: getString(formData, "objective")
  });

  if (!parsed.success) {
    notice("/agency-brain", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/agency-brain", "db-missing");
  }

  let reportId = "";

  try {
    const result = await runAgencyBrain(parsed.data);
    reportId = result.reportId;
  } catch (error) {
    if (error instanceof Error && error.message === openAiTextConfigurationError) {
      notice("/agency-brain", "openai-config-missing");
    }

    notice("/agency-brain", "agency-brain-error");
  }

  notice(`/agency-brain?report=${reportId}`, "agency-brain-created");
}

export async function recordManualMetricAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") ?? "/";
  const parsed = manualMetricSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    company: getString(formData, "company") ?? "",
    campaignId: getString(formData, "campaignId"),
    channel: getString(formData, "channel"),
    metricDate: getString(formData, "metricDate"),
    subject: getString(formData, "subject") ?? "",
    impressions: getString(formData, "impressions") ?? "0",
    clicks: getString(formData, "clicks") ?? "0",
    replies: getString(formData, "replies") ?? "0",
    meetingsBooked: getString(formData, "meetingsBooked") ?? "0",
    conversions: getString(formData, "conversions") ?? "0",
    bookings: getString(formData, "bookings") ?? "0",
    notes: getString(formData, "notes") ?? ""
  });

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  try {
    const productRecord = parsed.data.productSlug
      ? await ensureProductRecord(parsed.data.productSlug)
      : null;

    await prisma.manualTrackingEntry.create({
      data: {
        productId: productRecord?.id,
        campaignId: parsed.data.campaignId,
        company: parsed.data.company,
        channel: parsed.data.channel,
        emailSentDate: parsed.data.channel === "email" ? new Date(parsed.data.metricDate) : null,
        subject: parsed.data.subject,
        replyStatus: parsed.data.channel === "email" ? "sent_manually" : "not_sent",
        nextAction: "Review in the next daily run.",
        impressions: parsed.data.impressions,
        clicks: parsed.data.clicks,
        replies: parsed.data.replies,
        meetingsBooked: parsed.data.meetingsBooked || parsed.data.bookings,
        conversions: parsed.data.conversions,
        notes: parsed.data.notes,
        status: "tracking",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.agencyMemory.create({
      data: {
        productId: productRecord?.id,
        title: "Manual metric recorded",
        category: "market_insights",
        source: "manual_tracking",
        insight:
          "A manual performance result was added and should influence the next daily recommendation.",
        recommendation:
          "Compare this result with message angle, channel, and segment before drafting the next campaign.",
        confidence: 75,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice(returnTo, "db-error");
  }

  notice(returnTo, "metric-recorded");
}

export async function writePostAction(formData: FormData) {
  const parsed = writePostSchema.safeParse({
    productSlug: getString(formData, "productSlug")
  });

  if (!parsed.success) {
    notice("/", "invalid");
  }

  const product = getProduct(parsed.data.productSlug);

  if (!product) {
    notice("/", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/products/${parsed.data.productSlug}`, "db-missing");
  }

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);
    const draft = buildPostDraft(product);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    const campaign = await prisma.campaign.create({
      data: {
        productId: productRecord.id,
        name: `Daily post draft for ${product.name}`,
        targetSegment: product.audienceName,
        objective: "Create approval-ready social content based on current product memory.",
        channel: "manual",
        hypothesis:
          "Daily content improves trust when it uses product memory and avoids repeated sales-only angles.",
        successMetrics: ["manual review quality", "engagement", "saved learning"],
        brief: draft.topic,
        messageAngle: draft.topic,
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.socialPostDraft.createMany({
      data: [
        {
          productId: productRecord.id,
          campaignId: campaign.id,
          platform: "facebook",
          campaignAngle: draft.topic,
          audience: product.audienceName,
          postType: "educational",
          hook: draft.topic,
          body: draft.facebook,
          cta: draft.cta,
          imageConcept: "Professional product-context visual tied to the post angle.",
          imagePromptEn: draft.imagePrompt,
          hashtags: [],
          visualAvoid: product.prohibitedClaims,
          status: "owner_review",
          approved_by_owner: false,
          manual_execution_required: true
        },
        {
          productId: productRecord.id,
          campaignId: campaign.id,
          platform: "instagram",
          campaignAngle: draft.topic,
          audience: product.audienceName,
          postType: "educational",
          hook: draft.topic,
          body: draft.instagram,
          cta: draft.cta,
          imageConcept: "Short visual-first version of the same campaign angle.",
          imagePromptEn: draft.imagePrompt,
          hashtags: product.socialHashtags,
          visualAvoid: product.prohibitedClaims,
          status: "owner_review",
          approved_by_owner: false,
          manual_execution_required: true
        }
      ]
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        itemType: "social_post_drafts",
        itemId: campaign.id,
        contentPreview: `Two social post drafts created for ${product.name}.`,
        riskWarnings: ["No auto publishing", "Owner approval required", "Manual execution required"],
        complianceChecklist: [
          "No guaranteed results",
          "No criticism of the target company",
          "Product claims match knowledge base"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice(`/products/${parsed.data.productSlug}`, "db-error");
  }

  notice(`/products/${parsed.data.productSlug}`, "post-draft-created");
}

export async function generateFacebookPostAction(formData: FormData) {
  const parsed = writePostSchema.safeParse({
    productSlug: getString(formData, "productSlug")
  });

  if (!parsed.success) {
    notice("/products", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/products/${parsed.data.productSlug}`, "db-missing");
  }

  let draftId = "";

  try {
    const result = await generateFacebookPostForProduct({
      productSlug: parsed.data.productSlug
    });
    draftId = result.draftId;
  } catch (error) {
    if (error instanceof Error && error.message === openAiTextConfigurationError) {
      notice(`/products/${parsed.data.productSlug}`, "openai-config-missing");
    }

    notice(`/products/${parsed.data.productSlug}`, "content-studio-error");
  }

  notice(`/products/${parsed.data.productSlug}?draft=${draftId}`, "content-studio-created");
}

export async function generateFacebookImageAction(formData: FormData) {
  const parsed = generateFacebookImageSchema.safeParse({
    socialPostDraftId: getString(formData, "socialPostDraftId"),
    returnTo: getString(formData, "returnTo") ?? "/social-studio"
  });

  const returnTo = safeReturnTo(getString(formData, "returnTo"));

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  try {
    await generateFacebookImageAsset({
      socialPostDraftId: parsed.data.socialPostDraftId
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_IMAGE_CONFIGURATION_MISSING") {
      notice(returnTo, "image-config-missing");
    }

    notice(returnTo, "image-generation-error");
  }

  notice(returnTo, "facebook-image-created");
}

export async function dismissDashboardCardAction(formData: FormData) {
  const parsed = dismissCardSchema.safeParse({
    itemType: getString(formData, "itemType"),
    itemId: getString(formData, "itemId"),
    productSlug: getString(formData, "productSlug"),
    returnTo: getString(formData, "returnTo") ?? "/",
    dismissReason: getString(formData, "dismissReason")
  });
  const returnTo = safeReturnTo(getString(formData, "returnTo"));

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  try {
    await dismissCard({
      itemType: parsed.data.itemType,
      itemId: parsed.data.itemId,
      productSlug: parsed.data.productSlug,
      dismissReason: parsed.data.dismissReason
    });
  } catch {
    notice(returnTo, "db-error");
  }

  notice(returnTo, "card-dismissed");
}

export async function restoreDashboardCardAction(formData: FormData) {
  const parsed = dismissCardSchema.safeParse({
    itemType: getString(formData, "itemType"),
    itemId: getString(formData, "itemId"),
    returnTo: getString(formData, "returnTo") ?? "/"
  });
  const returnTo = safeReturnTo(getString(formData, "returnTo"));

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  try {
    await restoreDismissedCard({
      itemType: parsed.data.itemType,
      itemId: parsed.data.itemId
    });
  } catch {
    notice(returnTo, "db-error");
  }

  notice(returnTo, "card-restored");
}

export async function importManualCsvLeadsAction(formData: FormData) {
  const parsed = writePostSchema.safeParse({
    productSlug: getString(formData, "productSlug")
  });

  if (!parsed.success) {
    notice("/products", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/products/${parsed.data.productSlug}/lead-research/live`, "db-missing");
  }

  const csvFile = formData.get("csvFile");

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    notice(`/products/${parsed.data.productSlug}/lead-research/live`, "invalid");
  }

  let reportId = "";

  try {
    const result = await importManualCsvLeads({
      productSlug: parsed.data.productSlug,
      csvText: await csvFile.text()
    });
    reportId = result.reportId;
  } catch {
    notice(`/products/${parsed.data.productSlug}/lead-research/live`, "manual-csv-import-error");
  }

  notice(`/reports/${reportId}`, "manual-csv-import-created");
}

export async function createLeadResearchTaskAction(formData: FormData) {
  const parsed = leadResearchSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    targetCount: getString(formData, "targetCount") ?? "20"
  });

  if (!parsed.success) {
    notice("/", "invalid");
  }

  const returnTo = getString(formData, "returnTo") ?? `/products/${parsed.data.productSlug}`;
  const product = getProduct(parsed.data.productSlug);

  if (!product) {
    notice("/", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    const campaign = await prisma.campaign.create({
      data: {
        productId: productRecord.id,
        name: `Find ${parsed.data.targetCount} qualified leads for ${product.name}`,
        targetSegment: product.audienceName,
        objective:
          "Create a Codex research task for qualified Swedish leads with official email verification.",
        channel: "codex_research",
        hypothesis:
          "Carefully selected companies with official contact verification produce higher-quality outreach lists than broad scraping.",
        successMetrics: ["20 researched leads", "fit_score >= 85", "official email source URL"],
        brief: buildLeadResearchBrief(product),
        messageAngle: "Opportunity-based lead research with official contact verification.",
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        itemType: "lead_research_task",
        itemId: campaign.id,
        contentPreview: `Codex research task for ${parsed.data.targetCount} qualified ${product.name} leads.`,
        riskWarnings: [
          "No guessed emails",
          "Official email source required",
          "fit_score is not a sales guarantee"
        ],
        complianceChecklist: [
          "Every lead needs reason for fit",
          "Every email needs official source URL",
          "Only fit_score >= 85 can be qualified"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice(returnTo, "db-error");
  }

  notice(returnTo, "lead-task-created");
}

export async function createCampaignBriefAction(formData: FormData) {
  const parsed = campaignBriefSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    targetSegment: getString(formData, "targetSegment"),
    objective: getString(formData, "objective"),
    channel: getString(formData, "channel"),
    messageAngle: getString(formData, "messageAngle")
  });

  if (!parsed.success) {
    notice("/campaigns", "invalid");
  }

  const product = getProduct(parsed.data.productSlug);

  if (!product) {
    notice("/campaigns", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/campaigns", "db-missing");
  }

  const brief = [
    `# Campaign Brief: ${product.name}`,
    "",
    `Product: ${product.name}`,
    `Product type: ${product.productType}`,
    `Audience: ${product.audience}`,
    `Positioning: ${product.positioning}`,
    `Target segment: ${parsed.data.targetSegment}`,
    `Problem/opportunity: ${product.problemSolved}`,
    `Pain points: ${product.painPoints.join("; ")}`,
    `Core message: ${parsed.data.messageAngle}`,
    `Offer: ${product.cta}`,
    `Channels: ${parsed.data.channel}`,
    `Lead criteria: ${product.leadCriteria.join("; ")}`,
    `Tone rules: ${product.preferredTone.join(", ")}, opportunity-based, no pressure.`,
    `Content angles: ${product.contentAngles.join("; ")}`,
    "Messaging boundary: do not borrow claims, audience language, feature language, or examples from another Smart Art AI Solutions product.",
    `Compliance notes: ${product.prohibitedClaims.join("; ")}`,
    "Context rule: use only this selected product context. Refuse to mix product contexts.",
    `Success metrics: ${parsed.data.objective}`
  ].join("\n");

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    const campaign = await prisma.campaign.create({
      data: {
        productId: productRecord.id,
        name: `Campaign brief for ${product.name}`,
        targetSegment: parsed.data.targetSegment,
        objective: parsed.data.objective,
        channel: parsed.data.channel,
        hypothesis: `The segment responds to ${parsed.data.messageAngle}.`,
        successMetrics: ["reply quality", "lead quality", "manual tracking outcomes"],
        messageAngle: parsed.data.messageAngle,
        brief,
        status: "strategy_ready",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        itemType: "campaign_brief",
        itemId: campaign.id,
        contentPreview: `Campaign brief created for ${product.name}: ${parsed.data.messageAngle}`,
        riskWarnings: ["Owner review required", "Manual execution only"],
        complianceChecklist: [
          "Brief uses known product facts",
          "No live sending",
          "No live publishing"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice("/campaigns", "db-error");
  }

  notice("/campaigns", "campaign-brief-created");
}

export async function importResearchedLeadAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") ?? "/lead-research";
  const parsed = importLeadSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    campaignId: getString(formData, "campaignId"),
    companyName: getString(formData, "companyName"),
    website: getString(formData, "website"),
    city: getString(formData, "city"),
    industry: getString(formData, "industry"),
    segment: getString(formData, "segment"),
    sourceUrl: getString(formData, "sourceUrl"),
    fitScore: getString(formData, "fitScore"),
    confidenceLevel: getString(formData, "confidenceLevel"),
    reasonForFit: getString(formData, "reasonForFit"),
    officialEmail: getString(formData, "officialEmail"),
    emailSourceUrl: getString(formData, "emailSourceUrl"),
    emailSourcePage: getString(formData, "emailSourcePage"),
    emailConfidence: getString(formData, "emailConfidence"),
    bestEntryAngle: getString(formData, "bestEntryAngle"),
    tags: getString(formData, "tags") ?? ""
  });

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  const hasOfficialEmail = Boolean(parsed.data.officialEmail && parsed.data.emailSourceUrl);
  const isQualified = parsed.data.fitScore >= 85 && hasOfficialEmail;

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    const lead = await prisma.lead.create({
      data: {
        productId: productRecord.id,
        campaignId: parsed.data.campaignId,
        companyName: parsed.data.companyName,
        website: parsed.data.website,
        city: parsed.data.city,
        country: "Sweden",
        industry: parsed.data.industry,
        segment: parsed.data.segment,
        sourceUrl: parsed.data.sourceUrl,
        fitScore: parsed.data.fitScore,
        confidenceLevel: parsed.data.confidenceLevel,
        reasonForFit: parsed.data.reasonForFit,
        officialEmail: parsed.data.officialEmail,
        emailSourceUrl: parsed.data.emailSourceUrl,
        emailConfidence: parsed.data.emailConfidence,
        contactStatus: hasOfficialEmail ? "official_email_verified" : "email_not_verified",
        tags: splitList(parsed.data.tags),
        bestEntryAngle: parsed.data.bestEntryAngle,
        status: isQualified ? "qualified" : hasOfficialEmail ? "contact_verified" : "discovered",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: isQualified
          ? "Imported lead meets fit score and official email source requirements."
          : "Imported lead is not qualified until fit score and official email source requirements are met."
      }
    });

    if (hasOfficialEmail && parsed.data.officialEmail && parsed.data.emailSourceUrl) {
      await prisma.contactVerification.create({
        data: {
          leadId: lead.id,
          officialEmail: parsed.data.officialEmail,
          emailSourceUrl: parsed.data.emailSourceUrl,
          emailSourcePage: parsed.data.emailSourcePage || "Official company page",
          emailConfidence: parsed.data.emailConfidence,
          isOfficialSource: true,
          status: "completed",
          approved_by_owner: false,
          manual_execution_required: true
        }
      });
    }

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: parsed.data.campaignId,
        leadId: lead.id,
        itemType: "lead",
        itemId: lead.id,
        contentPreview: `${parsed.data.companyName} imported with fit_score ${parsed.data.fitScore}.`,
        riskWarnings: hasOfficialEmail
          ? ["Do not contact automatically", "Owner approval required"]
          : ["Official email source missing", "Lead cannot be qualified yet"],
        complianceChecklist: [
          "fit_score is not a sales guarantee",
          "No guessed email addresses",
          "Manual execution required"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice(returnTo, "db-error");
  }

  notice(returnTo, isQualified ? "lead-qualified" : "lead-imported");
}

export async function createWebsiteAnalysisAction(formData: FormData) {
  const parsed = websiteAnalysisSchema.safeParse({
    leadId: getString(formData, "leadId"),
    menuServiceClarity: getString(formData, "menuServiceClarity"),
    customerJourney: getString(formData, "customerJourney"),
    mobileExperience: getString(formData, "mobileExperience"),
    bookingContactClarity: getString(formData, "bookingContactClarity"),
    visualClarity: getString(formData, "visualClarity"),
    trustSignals: getString(formData, "trustSignals"),
    conversionFriction: getString(formData, "conversionFriction"),
    opportunityFraming: getString(formData, "opportunityFraming"),
    productFitReason: getString(formData, "productFitReason"),
    confidenceLevel: getString(formData, "confidenceLevel")
  });

  if (!parsed.success) {
    notice("/website-analysis", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/website-analysis", "db-missing");
  }

  let analysisId = "";

  try {
    const analysis = await prisma.leadAnalysis.upsert({
      where: { leadId: parsed.data.leadId },
      update: {
        menuServiceClarity: parsed.data.menuServiceClarity,
        customerJourney: parsed.data.customerJourney,
        mobileExperience: parsed.data.mobileExperience,
        bookingContactClarity: parsed.data.bookingContactClarity,
        visualClarity: parsed.data.visualClarity,
        trustSignals: parsed.data.trustSignals,
        conversionFriction: parsed.data.conversionFriction,
        opportunityFraming: parsed.data.opportunityFraming,
        productFitReason: parsed.data.productFitReason,
        confidenceLevel: parsed.data.confidenceLevel,
        status: "completed",
        approved_by_owner: false,
        manual_execution_required: true
      },
      create: {
        leadId: parsed.data.leadId,
        menuServiceClarity: parsed.data.menuServiceClarity,
        customerJourney: parsed.data.customerJourney,
        mobileExperience: parsed.data.mobileExperience,
        bookingContactClarity: parsed.data.bookingContactClarity,
        visualClarity: parsed.data.visualClarity,
        trustSignals: parsed.data.trustSignals,
        conversionFriction: parsed.data.conversionFriction,
        opportunityFraming: parsed.data.opportunityFraming,
        productFitReason: parsed.data.productFitReason,
        confidenceLevel: parsed.data.confidenceLevel,
        status: "completed",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.lead.updateMany({
      where: { id: parsed.data.leadId, status: "discovered" },
      data: { status: "analyzed" }
    });

    analysisId = analysis.id;
  } catch {
    notice("/website-analysis", "db-error");
  }

  notice(`/website-analysis/${analysisId}`, "website-analysis-created");
}

export async function createContactVerificationAction(formData: FormData) {
  const parsed = contactVerificationSchema.safeParse({
    leadId: getString(formData, "leadId"),
    officialEmail: getString(formData, "officialEmail"),
    emailSourceUrl: getString(formData, "emailSourceUrl"),
    emailSourcePage: getString(formData, "emailSourcePage"),
    emailConfidence: getString(formData, "emailConfidence"),
    notes: getString(formData, "notes") ?? ""
  });

  if (!parsed.success) {
    notice("/leads", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/leads", "db-missing");
  }

  try {
    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId } });

    if (!lead) {
      throw new Error("Lead not found");
    }

    await prisma.contactVerification.upsert({
      where: { leadId: parsed.data.leadId },
      update: {
        officialEmail: parsed.data.officialEmail,
        emailSourceUrl: parsed.data.emailSourceUrl,
        emailSourcePage: parsed.data.emailSourcePage,
        emailConfidence: parsed.data.emailConfidence,
        isOfficialSource: true,
        notes: parsed.data.notes,
        status: "completed",
        approved_by_owner: false,
        manual_execution_required: true
      },
      create: {
        leadId: parsed.data.leadId,
        officialEmail: parsed.data.officialEmail,
        emailSourceUrl: parsed.data.emailSourceUrl,
        emailSourcePage: parsed.data.emailSourcePage,
        emailConfidence: parsed.data.emailConfidence,
        isOfficialSource: true,
        notes: parsed.data.notes,
        status: "completed",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    const protectedStatuses = [
      "outreach_drafted",
      "owner_review",
      "approved_for_contact",
      "contacted_manually",
      "responded",
      "converted",
      "closed"
    ];
    const nextStatus = protectedStatuses.includes(lead.status)
      ? lead.status
      : lead.fitScore >= 85
        ? "qualified"
        : "contact_verified";

    await prisma.lead.update({
      where: { id: parsed.data.leadId },
      data: {
        officialEmail: parsed.data.officialEmail,
        emailSourceUrl: parsed.data.emailSourceUrl,
        emailConfidence: parsed.data.emailConfidence,
        contactStatus: "official_email_verified",
        status: nextStatus as any
      }
    });
  } catch {
    notice("/leads", "db-error");
  }

  notice(`/leads/${parsed.data.leadId}`, "contact-verified");
}

export async function createOutreachDraftAction(formData: FormData) {
  const parsed = outreachDraftSchema.safeParse({
    leadId: getString(formData, "leadId"),
    subject: getString(formData, "subject"),
    opening: getString(formData, "opening"),
    observation: getString(formData, "observation"),
    opportunity: getString(formData, "opportunity"),
    productConnection: getString(formData, "productConnection"),
    softCta: getString(formData, "softCta"),
    closing: getString(formData, "closing"),
    optOutText: getString(formData, "optOutText") ?? "",
    bodyPreview: getString(formData, "bodyPreview") ?? ""
  });

  if (!parsed.success) {
    notice("/outreach-studio", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/outreach-studio", "db-missing");
  }

  let draftId = "";
  let blockedLeadId = "";

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: parsed.data.leadId },
      include: { product: true, campaign: true }
    });

    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.fitScore < 85 || !lead.officialEmail || !lead.emailSourceUrl) {
      blockedLeadId = lead.id;
    } else {
      const bodyPreview =
        parsed.data.bodyPreview ||
        [
          parsed.data.opening,
          "",
          parsed.data.observation,
          "",
          parsed.data.opportunity,
          "",
          parsed.data.productConnection,
          "",
          parsed.data.softCta,
          "",
          parsed.data.closing,
          parsed.data.optOutText ? `\n${parsed.data.optOutText}` : ""
        ].join("\n");

      const draft = await prisma.outreachDraft.create({
        data: {
          productId: lead.productId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          company: lead.companyName,
          subject: parsed.data.subject,
          opening: parsed.data.opening,
          observation: parsed.data.observation,
          opportunity: parsed.data.opportunity,
          productConnection: parsed.data.productConnection,
          softCta: parsed.data.softCta,
          closing: parsed.data.closing,
          optOutText: parsed.data.optOutText,
          bodyPreview,
          language: "sv",
          tone: "calm professional Swedish B2B",
          complianceChecklist: [
            "No aggressive language",
            "No guaranteed results",
            "Official email source verified",
            "Manual execution required"
          ],
          status: "owner_review",
          approved_by_owner: false,
          manual_execution_required: true
        }
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "outreach_drafted" }
      });

      await prisma.approvalItem.create({
        data: {
          productId: lead.productId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          itemType: "outreach_draft",
          itemId: draft.id,
          contentPreview: `${lead.companyName}: ${parsed.data.subject}`,
          riskWarnings: ["No auto sending", "Owner approval required", "Manual execution required"],
          complianceChecklist: draft.complianceChecklist,
          status: "owner_review",
          approved_by_owner: false,
          manual_execution_required: true
        }
      });

      draftId = draft.id;
    }
  } catch {
    notice("/outreach-studio", "db-error");
  }

  if (blockedLeadId) {
    notice(`/leads/${blockedLeadId}`, "lead-not-qualified");
  }

  notice(`/outreach-studio/${draftId}`, "outreach-draft-created");
}

export async function createSocialDraftAction(formData: FormData) {
  const parsed = socialDraftSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    campaignId: getString(formData, "campaignId"),
    platform: getString(formData, "platform"),
    campaignAngle: getString(formData, "campaignAngle"),
    audience: getString(formData, "audience"),
    postType: getString(formData, "postType"),
    hook: getString(formData, "hook"),
    body: getString(formData, "body"),
    cta: getString(formData, "cta"),
    hashtags: getString(formData, "hashtags") ?? "",
    imageConcept: getString(formData, "imageConcept"),
    imagePromptEn: getString(formData, "imagePromptEn"),
    visualAvoid: getString(formData, "visualAvoid") ?? ""
  });

  if (!parsed.success) {
    notice("/social-studio", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/social-studio", "db-missing");
  }

  let draftId = "";

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    let campaignId = parsed.data.campaignId;

    if (!campaignId) {
      const campaign = await prisma.campaign.create({
        data: {
          productId: productRecord.id,
          name: `Social draft: ${parsed.data.hook}`,
          targetSegment: parsed.data.audience,
          objective: "Create an approval-ready social post draft.",
          channel: parsed.data.platform,
          hypothesis: `The audience responds to ${parsed.data.campaignAngle}.`,
          successMetrics: ["manual review quality", "engagement", "learning captured"],
          messageAngle: parsed.data.campaignAngle,
          brief: parsed.data.body,
          status: "drafts_ready",
          approved_by_owner: false,
          manual_execution_required: true
        }
      });
      campaignId = campaign.id;
    }

    const draft = await prisma.socialPostDraft.create({
      data: {
        productId: productRecord.id,
        campaignId,
        platform: parsed.data.platform,
        campaignAngle: parsed.data.campaignAngle,
        audience: parsed.data.audience,
        postType: parsed.data.postType,
        hook: parsed.data.hook,
        body: parsed.data.body,
        cta: parsed.data.cta,
        hashtags: splitList(parsed.data.hashtags),
        imageConcept: parsed.data.imageConcept,
        imagePromptEn: parsed.data.imagePromptEn,
        visualAvoid: splitList(parsed.data.visualAvoid),
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId,
        itemType: "social_post_draft",
        itemId: draft.id,
        contentPreview: `${parsed.data.platform}: ${parsed.data.hook}`,
        riskWarnings: ["No auto publishing", "Owner approval required", "Manual execution required"],
        complianceChecklist: [
          "No guaranteed results",
          "No pressure language",
          "Visual prompt avoids unsupported claims"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    draftId = draft.id;
  } catch {
    notice("/social-studio", "db-error");
  }

  notice(`/social-studio/${draftId}`, "social-draft-created");
}

export async function createExperimentAction(formData: FormData) {
  const parsed = experimentSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    campaignId: getString(formData, "campaignId"),
    hypothesis: getString(formData, "hypothesis"),
    segment: getString(formData, "segment"),
    channel: getString(formData, "channel"),
    testSize: getString(formData, "testSize"),
    variantA: getString(formData, "variantA"),
    variantB: getString(formData, "variantB"),
    metric: getString(formData, "metric")
  });

  if (!parsed.success) {
    notice("/experiments", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/experiments", "db-missing");
  }

  try {
    const productRecord = await ensureProductRecord(parsed.data.productSlug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    await prisma.experiment.create({
      data: {
        productId: productRecord.id,
        campaignId: parsed.data.campaignId,
        hypothesis: parsed.data.hypothesis,
        segment: parsed.data.segment,
        channel: parsed.data.channel,
        testSize: parsed.data.testSize,
        variantA: parsed.data.variantA,
        variantB: parsed.data.variantB,
        metric: parsed.data.metric,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice("/experiments", "db-error");
  }

  notice("/experiments", "experiment-created");
}

export async function createMemoryInsightAction(formData: FormData) {
  const parsed = memorySchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    campaignId: getString(formData, "campaignId"),
    title: getString(formData, "title"),
    category: getString(formData, "category"),
    source: getString(formData, "source"),
    confidence: getString(formData, "confidence"),
    insight: getString(formData, "insight"),
    recommendation: getString(formData, "recommendation")
  });

  if (!parsed.success) {
    notice("/agency-memory", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/agency-memory", "db-missing");
  }

  try {
    const productRecord = parsed.data.productSlug
      ? await ensureProductRecord(parsed.data.productSlug)
      : null;

    await prisma.agencyMemory.create({
      data: {
        productId: productRecord?.id,
        campaignId: parsed.data.campaignId,
        title: parsed.data.title,
        category: parsed.data.category,
        source: parsed.data.source,
        confidence: parsed.data.confidence,
        insight: parsed.data.insight,
        recommendation: parsed.data.recommendation,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });
  } catch {
    notice("/agency-memory", "db-error");
  }

  notice("/agency-memory", "memory-created");
}

export async function createReportAction(formData: FormData) {
  const parsed = reportSchema.safeParse({
    productSlug: getString(formData, "productSlug"),
    campaignId: getString(formData, "campaignId"),
    type: getString(formData, "type"),
    title: getString(formData, "title"),
    summary: getString(formData, "summary"),
    whatWasDone: getString(formData, "whatWasDone") ?? "",
    whatWorked: getString(formData, "whatWorked") ?? "",
    whatDidNotWork: getString(formData, "whatDidNotWork") ?? "",
    recommendations: getString(formData, "recommendations") ?? "",
    nextWeekPlan: getString(formData, "nextWeekPlan") ?? ""
  });

  if (!parsed.success) {
    notice("/reports", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/reports", "db-missing");
  }

  const whatWasDone = splitList(parsed.data.whatWasDone);
  const whatWorked = splitList(parsed.data.whatWorked);
  const whatDidNotWork = splitList(parsed.data.whatDidNotWork);
  const recommendations = splitList(parsed.data.recommendations);
  const nextWeekPlan = splitList(parsed.data.nextWeekPlan);

  let reportId = "";

  try {
    const productRecord = parsed.data.productSlug
      ? await ensureProductRecord(parsed.data.productSlug)
      : null;

    const report = await prisma.report.create({
      data: {
        productId: productRecord?.id,
        campaignId: parsed.data.campaignId,
        type: parsed.data.type,
        title: parsed.data.title,
        summary: parsed.data.summary,
        whatWasDone,
        numbers: {},
        whatWorked,
        whatDidNotWork,
        recommendations,
        nextWeekPlan,
        markdown: buildReportMarkdown({
          title: parsed.data.title,
          summary: parsed.data.summary,
          whatWasDone,
          whatWorked,
          whatDidNotWork,
          recommendations,
          nextWeekPlan
        }),
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord?.id,
        campaignId: parsed.data.campaignId,
        itemType: "report",
        itemId: report.id,
        contentPreview: `${parsed.data.type}: ${parsed.data.title}`,
        riskWarnings: ["Owner review required before external sharing"],
        complianceChecklist: ["Numbers are manually entered", "No live publishing", "Manual execution required"],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    reportId = report.id;
  } catch {
    notice("/reports", "db-error");
  }

  notice(`/reports/${reportId}`, "report-created");
}

export async function createCampaignLeadReportAction(formData: FormData) {
  const campaignId = getString(formData, "campaignId");

  if (!campaignId) {
    notice("/campaigns", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/campaigns/${campaignId}`, "db-missing");
  }

  let reportId = "";

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        product: true,
        leads: {
          orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
          include: {
            contactVerification: true,
            leadAnalysis: true
          }
        }
      }
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const importedLeads = campaign.leads.length;
    const qualifiedLeads = campaign.leads.filter((lead) => lead.fitScore >= 85).length;
    const verifiedContacts = campaign.leads.filter(
      (lead) => lead.officialEmail && lead.emailSourceUrl
    ).length;
    const leadLines = campaign.leads.map((lead, index) =>
      [
        `${index + 1}. ${lead.companyName}`,
        `   - Website: ${lead.website}`,
        `   - City: ${lead.city}`,
        `   - Status: ${lead.status}`,
        `   - fit_score: ${lead.fitScore}`,
        `   - Official email: ${lead.officialEmail ?? "missing"}`,
        `   - Email source: ${lead.emailSourceUrl ?? "missing"}`,
        `   - Reason for fit: ${lead.reasonForFit}`,
        `   - Entry angle: ${lead.bestEntryAngle || "not recorded"}`
      ].join("\n")
    );
    const markdown = [
      `# تقرير بحث العملاء: ${campaign.name}`,
      "",
      `المنتج: ${campaign.product.name}`,
      `العملاء المستوردون: ${importedLeads}`,
      `العملاء المؤهلون: ${qualifiedLeads}`,
      `جهات الاتصال الرسمية المتحققة: ${verifiedContacts}`,
      "",
      "السلامة:",
      "- درجة الملاءمة ليست ضمانًا للبيع.",
      "- لا يتم قبول رسائل بريد مخمّنة.",
      "- لا يوجد أي تواصل تلقائي.",
      "- التنفيذ اليدوي مطلوب حتى بعد الموافقة.",
      "",
      "## العملاء",
      leadLines.length > 0 ? leadLines.join("\n\n") : "لم يتم استيراد عملاء بعد."
    ].join("\n");

    const report = await prisma.report.create({
      data: {
        productId: campaign.productId,
        campaignId: campaign.id,
        type: "lead_quality_report",
        title: `تقرير بحث العملاء: ${campaign.name}`,
        summary:
          importedLeads === 0
            ? "لم يتم استيراد عملاء لهذه المهمة بعد."
            : `تم استيراد ${importedLeads} عميلًا؛ ${qualifiedLeads} يحققون حد درجة الملاءمة؛ ${verifiedContacts} لديهم حقول مصدر اتصال رسمي.`,
        whatWasDone: [
          "تم تجميع العملاء المستوردين الحاليين لهذه المهمة.",
          "تم فحص درجة الملاءمة وحقول مصدر الاتصال الرسمي المخزنة في لوحة التحكم."
        ],
        numbers: {
          importedLeads,
          qualifiedLeads,
          verifiedContacts
        },
        whatWorked:
          importedLeads > 0
            ? ["سجلات العملاء المستوردة جاهزة للمراجعة."]
            : ["مهمة البحث موجودة، لكن لم يتم استيراد أي سجلات عملاء بعد."],
        whatDidNotWork:
          importedLeads < 20
            ? [`تقرير 20 عميلًا المطلوب غير مكتمل: تم استيراد ${importedLeads}/20.`]
            : [],
        recommendations:
          importedLeads < 20
            ? ["استمر في بحث العملاء واستيراد العملاء المتحققين حتى يصل التقرير إلى 20 عميلًا."]
            : ["راجع جودة العملاء وعناصر الموافقة قبل أي تواصل يدوي."],
        nextWeekPlan: ["استخدم العملاء المعتمدين فقط في تواصل يدوي."],
        markdown,
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: campaign.productId,
        campaignId: campaign.id,
        itemType: "report",
        itemId: report.id,
        contentPreview: `تم إنشاء تقرير بحث العملاء لـ ${campaign.name}: تم استيراد ${importedLeads}/20.`,
        riskWarnings: [
          "مراجعة المالك مطلوبة قبل أي مشاركة خارجية",
          "لا يوجد إرسال تلقائي",
          "لا يوجد أي تواصل تلقائي"
        ],
        complianceChecklist: [
          "درجة الملاءمة ليست ضمانًا للبيع",
          "مصدر البريد الرسمي مطلوب للعملاء المؤهلين",
          "التنفيذ اليدوي مطلوب"
        ],
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true
      }
    });

    reportId = report.id;
  } catch {
    notice(`/campaigns/${campaignId}`, "db-error");
  }

  notice(`/reports/${reportId}`, "lead-report-created");
}

export async function seedProductsAction() {
  if (!hasDatabaseUrl()) {
    notice("/", "db-missing");
  }

  try {
    for (const product of products) {
      await ensureProductRecord(product.slug);
    }
    await ensureBalancedProductExamples();
  } catch {
    notice("/", "db-error");
  }

  notice("/", "products-seeded");
}

export async function createPersistenceSmokeTestAction(formData: FormData) {
  const parsed = writePostSchema.safeParse({
    productSlug: getString(formData, "productSlug")
  });

  if (!parsed.success) {
    notice("/settings", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice("/settings", "db-missing");
  }

  try {
    const smokeTestProduct = getProduct(parsed.data.productSlug);
    if (!smokeTestProduct) {
      notice("/settings", "invalid");
    }
    const productRecord = await ensureProductRecord(smokeTestProduct.slug);

    if (!productRecord) {
      throw new Error("Product record not available");
    }

    const campaign = await prisma.campaign.create({
      data: {
        productId: productRecord.id,
        name: "Persistence smoke test campaign",
        targetSegment: "Internal test segment",
        objective: "Verify PostgreSQL persistence without real-world outreach.",
        channel: "manual",
        hypothesis: "If persistence works, test records appear in Prisma Studio.",
        successMetrics: ["campaign saved", "lead saved", "draft email saved", "report saved"],
        messageAngle: "Internal persistence verification",
        brief: "Internal smoke test only. No live sending or publishing.",
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test."
      }
    });

    const lead = await prisma.lead.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        companyName: "Persistence Test Company",
        website: "https://example.com",
        city: "Test City",
        country: "Sweden",
        industry: "Internal test",
        segment: "Internal test",
        sourceUrl: "https://example.com",
        fitScore: 0,
        confidenceLevel: "low",
        reasonForFit: "Internal persistence verification only; not a real qualified lead.",
        officialEmail: "hello@example.com",
        emailSourceUrl: "https://example.com",
        emailConfidence: "low",
        contactStatus: "internal_test_not_for_contact",
        tags: ["internal-test", "do-not-contact"],
        bestEntryAngle: "Internal testing only",
        status: "discovered",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal test lead. Do not contact."
      }
    });

    await prisma.outreachDraft.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        leadId: lead.id,
        company: "Persistence Test Company",
        subject: "Internal persistence test",
        opening: "Hej, detta är ett internt test.",
        observation: "This is not for external use.",
        opportunity: "Verify that draft email records persist.",
        productConnection: `${smokeTestProduct.name} is used only as a linked product in this internal persistence test.`,
        softCta: "No CTA. Internal test only.",
        closing: "Internal system test.",
        language: "sv",
        tone: "internal test",
        complianceChecklist: ["No live sending", "Internal test", "Manual execution required"],
        optOutText: "",
        bodyPreview: "Internal draft email persistence test. Do not send.",
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test email draft."
      }
    });

    await prisma.socialPostDraft.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        platform: "manual",
        campaignAngle: "Internal persistence verification",
        audience: "Internal",
        postType: "internal test",
        hook: "Persistence smoke test",
        body: "Internal social draft persistence test. Do not publish.",
        cta: "No CTA.",
        hashtags: ["internaltest"],
        imageConcept: "No image required.",
        imagePromptEn: "Internal test placeholder. Do not generate externally.",
        visualAvoid: ["external publishing", "real customer claims"],
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test social draft."
      }
    });

    await prisma.agencyMemory.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        title: "Persistence smoke test memory",
        category: "compliance_lessons",
        source: "settings_smoke_test",
        confidence: 100,
        insight: "Database persistence smoke test was requested.",
        recommendation: "Verify records in Prisma Studio, then delete internal test records if desired.",
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test memory."
      }
    });

    await prisma.report.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        type: "weekly_campaign_report",
        title: "Persistence Smoke Test Report",
        summary: "Internal database persistence verification report.",
        whatWasDone: [
          "Created internal campaign",
          "Created internal lead",
          "Created draft email",
          "Created social draft"
        ],
        numbers: { testRecordsCreated: 6 },
        whatWorked: ["If visible in Prisma Studio, persistence is working."],
        whatDidNotWork: [],
        recommendations: ["Keep manual_mode enabled."],
        nextWeekPlan: ["Continue using approval-gated workflows."],
        markdown: "# Persistence Smoke Test Report\n\nInternal verification only.",
        status: "draft",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test report."
      }
    });

    await prisma.approvalItem.create({
      data: {
        productId: productRecord.id,
        campaignId: campaign.id,
        leadId: lead.id,
        itemType: "persistence_smoke_test",
        itemId: campaign.id,
        contentPreview: "Internal persistence smoke test records created.",
        riskWarnings: ["Do not contact", "Do not publish", "Manual execution required"],
        complianceChecklist: ["approved_by_owner is false", "manual_execution_required is true"],
        finalStatus: "manual_execution_required",
        status: "owner_review",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "Internal persistence test approval item."
      }
    });
  } catch {
    notice("/settings", "db-error");
  }

  notice("/settings", "persistence-test-created");
}

export async function updateApprovalDecisionAction(formData: FormData) {
  const parsed = approvalDecisionSchema.safeParse({
    approvalId: getString(formData, "approvalId"),
    decision: getString(formData, "decision")
  });

  if (!parsed.success) {
    notice("/approval-center", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/approval-center/${parsed.data.approvalId}`, "db-missing");
  }

  const statusByDecision = {
    approve: "approved_by_owner",
    request_revision: "needs_revision",
    reject: "rejected",
    mark_reviewed: "reviewed"
  } as const;

  try {
    const item = await prisma.approvalItem.update({
      where: { id: parsed.data.approvalId },
      data: {
        status: statusByDecision[parsed.data.decision],
        approved_by_owner: parsed.data.decision === "approve",
        approvedBy: "owner",
        approvedAt: parsed.data.decision === "approve" ? new Date() : null,
        finalStatus: "manual_execution_required",
        manual_execution_required: true
      }
    });

    if (item.campaignId) {
      await prisma.campaign.update({
        where: { id: item.campaignId },
        data: {
          status: statusByDecision[parsed.data.decision],
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (item.itemType === "social_post_draft" || item.itemType === "content_studio_facebook_post") {
      await prisma.socialPostDraft.update({
        where: { id: item.itemId },
        data: {
          status: statusByDecision[parsed.data.decision],
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (item.itemType === "social_post_drafts" && item.campaignId) {
      await prisma.socialPostDraft.updateMany({
        where: { campaignId: item.campaignId },
        data: {
          status: statusByDecision[parsed.data.decision],
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (
      item.itemType === "outreach_draft" ||
      item.itemType === "live_lead_research_outreach" ||
      item.itemType === "manual_csv_lead_outreach"
    ) {
      await prisma.outreachDraft.update({
        where: { id: item.itemId },
        data: {
          status: statusByDecision[parsed.data.decision],
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (item.itemType === "manual_csv_lead_outreach" && item.leadId) {
      await prisma.lead.update({
        where: { id: item.leadId },
        data: {
          status: parsed.data.decision === "approve" ? "approved_for_contact" : "owner_review",
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (item.itemType === "lead" && item.leadId) {
      await prisma.lead.update({
        where: { id: item.leadId },
        data: {
          status: parsed.data.decision === "approve" ? "approved_for_contact" : "owner_review",
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }

    if (item.itemType === "report") {
      await prisma.report.update({
        where: { id: item.itemId },
        data: {
          status: statusByDecision[parsed.data.decision],
          approved_by_owner: parsed.data.decision === "approve",
          manual_execution_required: true
        }
      });
    }
  } catch {
    notice(`/approval-center/${parsed.data.approvalId}`, "db-error");
  }

  notice(`/approval-center/${parsed.data.approvalId}`, `approval-${parsed.data.decision}`);
}

function buildFacebookMessage(draft: {
  body: string;
  cta: string;
  hashtags: string[];
}) {
  const hashtags = draft.hashtags.length > 0 ? draft.hashtags.map((tag) => `#${tag}`).join(" ") : "";

  return [draft.body, draft.cta, hashtags].filter(Boolean).join("\n\n");
}

export async function approveAndPublishFacebookAction(formData: FormData) {
  const parsed = approveAndPublishFacebookSchema.safeParse({
    approvalId: getString(formData, "approvalId"),
    returnTo: getString(formData, "returnTo") ?? "/approval-center"
  });
  const returnTo = safeReturnTo(getString(formData, "returnTo"));

  if (!parsed.success) {
    notice(returnTo, "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(returnTo, "db-missing");
  }

  const attemptedAt = new Date();

  try {
    const item = await prisma.approvalItem.findUnique({
      where: { id: parsed.data.approvalId }
    });

    if (
      !item ||
      (item.itemType !== "social_post_draft" && item.itemType !== "content_studio_facebook_post")
    ) {
      notice(returnTo, "facebook-publish-invalid");
    }

    const draft = await prisma.socialPostDraft.findUnique({
      where: { id: item.itemId },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!draft || draft.platform !== "facebook") {
      notice(returnTo, "facebook-publish-invalid");
    }

    if (draft.status === "published" || draft.providerPostId) {
      notice(returnTo, "facebook-already-published");
    }

    const message = buildFacebookMessage(draft);
    const imageUrl = draft.assets.find((asset) => asset.imageUrl)?.imageUrl ?? null;

    await prisma.$transaction([
      prisma.approvalItem.update({
        where: { id: item.id },
        data: {
          approved_by_owner: true,
          approvedBy: "owner",
          approvedAt: item.approvedAt ?? attemptedAt,
          status: "approved_by_owner",
          finalStatus: "facebook_publish_attempted",
          manual_execution_required: true
        }
      }),
      prisma.socialPostDraft.update({
        where: { id: draft.id },
        data: {
          approved_by_owner: true,
          status: "approved_by_owner",
          publishAttemptedAt: attemptedAt,
          publishAttemptCount: { increment: 1 },
          publishError: null
        }
      })
    ]);

    const result = await publishToFacebook({
      message,
      imageUrl
    });

    await prisma.publishLog.create({
      data: {
        socialPostDraftId: draft.id,
        provider: "facebook",
        attemptedAt,
        success: result.success,
        providerPostId: result.postId,
        error: result.error,
        messagePreview: message.slice(0, 500)
      }
    });

    if (!result.success) {
      await prisma.$transaction([
        prisma.socialPostDraft.update({
          where: { id: draft.id },
          data: {
            status: "failed",
            provider: "facebook",
            publishError: result.error ?? "Facebook publishing failed",
            manual_execution_required: true
          }
        }),
        prisma.approvalItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            finalStatus: "facebook_publish_failed",
            manual_execution_required: true,
            notes: [item.notes, `facebook_publish_error:${result.error ?? "unknown"}`]
              .filter(Boolean)
              .join("\n")
          }
        })
      ]);

      notice(returnTo, result.error === "Facebook not configured" ? "facebook-not-configured" : "facebook-publish-failed");
    }

    await prisma.$transaction([
      prisma.socialPostDraft.update({
        where: { id: draft.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          provider: "facebook",
          providerPostId: result.postId,
          publishError: null,
          manual_execution_required: false
        }
      }),
      prisma.approvalItem.update({
        where: { id: item.id },
        data: {
          status: "published",
          finalStatus: "published_to_facebook",
          manual_execution_required: false,
          notes: [item.notes, `facebook_provider_post_id:${result.postId ?? "unknown"}`]
            .filter(Boolean)
            .join("\n")
        }
      })
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    notice(returnTo, "facebook-publish-failed");
  }

  notice(returnTo, "facebook-published");
}

export async function rejectLiveResearchLeadAction(formData: FormData) {
  const leadId = getString(formData, "leadId");
  const productSlug = getString(formData, "productSlug");

  if (!leadId || !productSlug) {
    notice("/products", "invalid");
  }

  if (!hasDatabaseUrl()) {
    notice(`/products/${productSlug}/lead-research/live`, "db-missing");
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "not_relevant",
        approved_by_owner: false,
        manual_execution_required: true,
        notes: "live_lead_research:rejected_by_owner"
      }
    });

    await prisma.approvalItem.updateMany({
      where: {
        leadId,
        itemType: "live_lead_research_outreach"
      },
      data: {
        status: "rejected",
        approved_by_owner: false,
        finalStatus: "manual_execution_required",
        manual_execution_required: true
      }
    });
  } catch {
    notice(`/products/${productSlug}/lead-research/live`, "db-error");
  }

  notice(`/products/${productSlug}/lead-research/live`, "live-lead-rejected");
}
