import { buildDailySummary, buildLeadResearchBrief, buildPostDraft } from "./daily-engine";
import { dismissalKey, getDismissedCardKeys } from "./dismissals";
import { hasDatabaseUrl, prisma } from "./db";
import { getLeadSearchProviderStatus } from "./lead-search-provider";
import { ProductSlug, getProduct, products } from "./product-data";

type DashboardNotice = {
  type: "success" | "warning" | "error";
  message: string;
};

export type ProductFilter = "all" | "global" | ProductSlug;

export type DashboardData = {
  products: typeof products;
  productFilter: ProductFilter;
  productFilterLabel: string;
  dbConnected: boolean;
  latestDailyRuns: Array<{
    id: string;
    productName: string;
    summary: string;
    status: string;
    createdAt: string;
  }>;
  memoryInsights: Array<{
    id: string;
    productName: string;
    title: string;
    insight: string;
    confidence: number;
  }>;
  approvalItems: Array<{
    id: string;
    itemType: string;
    label: string;
    status: string;
    riskWarnings: string[];
  }>;
  commandStats: {
    activeCampaigns: number;
    draftEmails: number;
    draftPosts: number;
    qualifiedLeads: number;
    /** Leads that have not yet had their contact info verified. */
    leadsToVerify: number;
    pendingApprovals: number;
  };
  notice?: DashboardNotice;
  showDismissed: boolean;
};

type DismissalOptions = {
  showDismissed?: boolean;
};

export type ProductsOverviewData = {
  dbConnected: boolean;
  products: Array<{
    slug: ProductSlug;
    name: string;
    positioning: string;
    targetAudience: string;
    status: string;
    campaignsCount: number;
    pendingApprovalsCount: number;
    recentDraftsCount: number;
  }>;
};

export function normalizeProductFilter(value?: string): ProductFilter {
  if (value === "global") {
    return "global";
  }

  if (products.some((product) => product.slug === value)) {
    return value as ProductSlug;
  }

  return "all";
}

export function getProductFilterLabel(filter: ProductFilter) {
  if (filter === "all") {
    return "كل المنتجات";
  }

  if (filter === "global") {
    return "عام";
  }

  return getProduct(filter)?.name ?? "كل المنتجات";
}

function matchesProductFilter(record: any, filter: ProductFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "global") {
    return !record.product && !record.productId;
  }

  return record.product?.slug === filter;
}

function withDismissalMeta<T extends { id: string }>(
  items: T[],
  itemType: string,
  dismissedKeys: Set<string>,
  showDismissed = false
) {
  return items
    .map((item) => ({
      ...item,
      _itemType: itemType,
      _dismissed: dismissedKeys.has(dismissalKey({ itemType, itemId: item.id }))
    }))
    .filter((item) => showDismissed || !item._dismissed);
}

export async function getDashboardData(
  notice?: DashboardNotice,
  filter: ProductFilter = "all",
  options: DismissalOptions = {}
): Promise<DashboardData> {
  if (!hasDatabaseUrl()) {
    return getFallbackDashboardData(false, notice, filter, options);
  }

  try {
    const [
      dailyRuns,
      memories,
      postDrafts,
      outreachDrafts,
      campaigns,
      leads,
      approvals,
      leadsToVerifyCount
    ] = await Promise.all([
      prisma.dailyRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { product: true }
      }),
      prisma.agencyMemory.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { product: true }
      }),
      prisma.socialPostDraft.findMany({
        where: { approved_by_owner: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { product: true }
      }),
      prisma.outreachDraft.findMany({
        where: { approved_by_owner: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { product: true }
      }),
      prisma.campaign.findMany({
        where: { status: { notIn: ["completed", "cancelled", "closed"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { product: true }
      }),
      prisma.lead.findMany({
        where: { status: "qualified" },
        take: 10,
        include: { product: true }
      }),
      prisma.approvalItem.findMany({
        where: { approved_by_owner: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { product: true, campaign: true }
      }),
      // Count leads that still need contact verification. Real count, not
      // capped — used for the "Leads to verify" KPI card.
      prisma.lead.count({
        where: { contactStatus: { in: ["not_verified", "discovered"] } }
      })
    ]);

    const filteredDailyRuns = dailyRuns.filter((run: any) => matchesProductFilter(run, filter));
    const filteredMemories = memories.filter((memory: any) => matchesProductFilter(memory, filter));
    const filteredPostDrafts = postDrafts.filter((post: any) => matchesProductFilter(post, filter));
    const filteredOutreachDrafts = outreachDrafts.filter((draft: any) => matchesProductFilter(draft, filter));
    const filteredCampaigns = campaigns.filter((campaign: any) => matchesProductFilter(campaign, filter));
    const filteredLeads = leads.filter((lead: any) => filter === "all" || lead.product?.slug === filter);
    const filteredApprovals = approvals.filter((item: any) => matchesProductFilter(item, filter));

    const dismissedKeys = await getDismissedCardKeys([
      ...filteredDailyRuns.map((item: any) => ({ itemType: "daily_run", itemId: item.id })),
      ...filteredMemories.map((item: any) => ({ itemType: "agency_memory", itemId: item.id })),
      ...filteredApprovals.map((item: any) => ({ itemType: "approval_item", itemId: item.id })),
      ...filteredPostDrafts.map((item: any) => ({ itemType: "social_post_draft", itemId: item.id })),
      ...filteredOutreachDrafts.map((item: any) => ({ itemType: "outreach_draft", itemId: item.id }))
    ]);
    const visibleDailyRuns = withDismissalMeta(filteredDailyRuns as any[], "daily_run", dismissedKeys, options.showDismissed);
    const visibleMemories = withDismissalMeta(filteredMemories as any[], "agency_memory", dismissedKeys, options.showDismissed);
    const visibleApprovals = withDismissalMeta(filteredApprovals as any[], "approval_item", dismissedKeys, options.showDismissed);
    const visiblePostDrafts = withDismissalMeta(filteredPostDrafts as any[], "social_post_draft", dismissedKeys, options.showDismissed);
    const visibleOutreachDrafts = withDismissalMeta(filteredOutreachDrafts as any[], "outreach_draft", dismissedKeys, options.showDismissed);

    return {
      products,
      productFilter: filter,
      productFilterLabel: getProductFilterLabel(filter),
      dbConnected: true,
      latestDailyRuns: visibleDailyRuns.map((run: any) => ({
        id: run.id,
        productName: run.product?.name ?? "عام",
        summary: run.summary,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        _dismissed: run._dismissed,
        _itemType: run._itemType
      })),
      memoryInsights: visibleMemories.map((memory: any) => ({
        id: memory.id,
        productName: memory.product?.name ?? "عام",
        title: memory.title,
        insight: memory.insight,
        confidence: memory.confidence,
        _dismissed: memory._dismissed,
        _itemType: memory._itemType
      })),
      approvalItems: [
        ...visibleApprovals.map((item: any) => ({
          id: item.id,
          itemType: item.itemType,
          label: `${item.product?.name ?? "عام"}: ${item.contentPreview}`,
          status: item.status,
          riskWarnings: item.riskWarnings,
          _dismissed: item._dismissed,
          _itemType: item._itemType
        })),
        ...visiblePostDrafts.map((post: any) => ({
          id: post.id,
          itemType: "منشور اجتماعي",
          label: `${post.product.name}: ${post.hook}`,
          status: post.status,
          riskWarnings: ["التنفيذ اليدوي مطلوب", "لا يوجد نشر تلقائي"],
          _dismissed: post._dismissed,
          _itemType: post._itemType
        })),
        ...visibleOutreachDrafts.map((draft: any) => ({
          id: draft.id,
          itemType: "مسودة تواصل",
          label: `${draft.product.name}: ${draft.subject}`,
          status: draft.status,
          riskWarnings: ["التنفيذ اليدوي مطلوب", "لا يوجد إرسال تلقائي"],
          _dismissed: draft._dismissed,
          _itemType: draft._itemType
        }))
      ],
      commandStats: {
        activeCampaigns: filteredCampaigns.length,
        draftEmails: visibleOutreachDrafts.length,
        draftPosts: visiblePostDrafts.length,
        qualifiedLeads: filteredLeads.length,
        leadsToVerify: leadsToVerifyCount,
        pendingApprovals: visibleApprovals.length + visiblePostDrafts.length + visibleOutreachDrafts.length
      },
      notice,
      showDismissed: Boolean(options.showDismissed)
    };
  } catch {
    return getFallbackDashboardData(false, {
      type: "warning",
      message:
        "قاعدة البيانات غير متاحة الآن. تعرض اللوحة بيانات آمنة من قاعدة المعرفة."
    }, filter, options);
  }
}

export async function getProductsOverview(): Promise<ProductsOverviewData> {
  if (!hasDatabaseUrl()) {
    return {
      dbConnected: false,
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        positioning: product.positioning,
        targetAudience: product.targetAudience,
        status: "وضع المعاينة",
        campaignsCount: 0,
        pendingApprovalsCount: 0,
        recentDraftsCount: 0
      }))
    };
  }

  try {
    const [campaigns, approvals, socialDrafts, outreachDrafts] = await Promise.all([
      prisma.campaign.findMany({ include: { product: true } }),
      prisma.approvalItem.findMany({
        where: { approved_by_owner: false },
        include: { product: true }
      }),
      prisma.socialPostDraft.findMany({ include: { product: true } }),
      prisma.outreachDraft.findMany({ include: { product: true } })
    ]);

    return {
      dbConnected: true,
      products: products.map((product) => {
        const matches = (record: any) => record.product?.slug === product.slug;

        return {
          slug: product.slug,
          name: product.name,
          positioning: product.positioning,
          targetAudience: product.targetAudience,
          status: "جاهز للتشغيل",
          campaignsCount: campaigns.filter(matches).length,
          pendingApprovalsCount: approvals.filter(matches).length,
          recentDraftsCount: socialDrafts.filter(matches).length + outreachDrafts.filter(matches).length
        };
      })
    };
  } catch {
    return {
      dbConnected: false,
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        positioning: product.positioning,
        targetAudience: product.targetAudience,
        status: "تعذر قراءة قاعدة البيانات",
        campaignsCount: 0,
        pendingApprovalsCount: 0,
        recentDraftsCount: 0
      }))
    };
  }
}

function getFallbackDashboardData(
  dbConnected: boolean,
  notice?: DashboardNotice,
  filter: ProductFilter = "all",
  options: DismissalOptions = {}
): DashboardData {
  const selectedProduct = filter !== "all" && filter !== "global" ? getProduct(filter) : undefined;
  const daily = buildDailySummary(selectedProduct);

  return {
    products,
    productFilter: filter,
    productFilterLabel: getProductFilterLabel(filter),
    dbConnected,
    latestDailyRuns: [
      {
        id: "preview-daily-run",
        productName: selectedProduct?.name ?? "عام",
        summary: daily.summary,
        status: "draft",
        createdAt: new Date().toISOString()
      }
    ],
    memoryInsights: [
      {
        id: "memory-1",
        productName: "عام",
        title: "التتبع اليدوي أولًا",
        insight:
          "سجّل النتائج يدويًا قبل استخدامها في التوصيات اليومية حتى تبقى ذاكرة الوكالة مبنية على نشاط حقيقي.",
        confidence: 80
      },
      {
        id: "memory-2",
        productName: "العملاء المحتملون",
        title: "مصدر البريد الرسمي مطلوب",
        insight:
          "لا يجب تأهيل العميل المحتمل إلا بعد التحقق من البريد من صفحة رسمية للشركة.",
        confidence: 95
      },
      {
        id: "memory-3",
        productName: "الالتزام",
        title: "صياغة الفرصة فقط",
        insight:
          "تحليل الموقع داخلي. يجب أن يحوّل التواصل الملاحظات إلى فرص محترمة لا إلى نقد.",
        confidence: 90
      }
    ],
    approvalItems: [
      {
        id: "approval-preview",
        itemType: "قاعدة نظام",
        label:
          "الإرسال والنشر المباشران معطلان. التنفيذ اليدوي مطلوب حتى بعد الموافقة.",
        status: "owner_review",
        riskWarnings: ["موافقة المالك مطلوبة", "التنفيذ اليدوي مطلوب"]
      }
    ],
    commandStats: {
      activeCampaigns: 0,
      draftEmails: 0,
      draftPosts: 0,
      qualifiedLeads: 0,
      leadsToVerify: 0,
      pendingApprovals: 1
    },
    notice,
    showDismissed: Boolean(options.showDismissed)
  };
}

export async function ensureProductRecord(slug: string) {
  const seed = getProduct(slug);

  if (!seed || !hasDatabaseUrl()) {
    return null;
  }

  return prisma.product.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      aliases: seed.aliases,
      shortDescription: seed.shortDescription,
      problemSolved: seed.problemSolved,
      targetAudience: seed.targetAudience,
      benefits: seed.benefits,
      features: seed.features,
      pricePlans: seed.pricePlans,
      sourceUrl: seed.sourceUrl,
      demoUrl: seed.demoUrl,
      approved_by_owner: false,
      manual_execution_required: true
    },
    create: {
      slug: seed.slug,
      name: seed.name,
      aliases: seed.aliases,
      shortDescription: seed.shortDescription,
      problemSolved: seed.problemSolved,
      targetAudience: seed.targetAudience,
      benefits: seed.benefits,
      features: seed.features,
      pricePlans: seed.pricePlans,
      sourceUrl: seed.sourceUrl,
      demoUrl: seed.demoUrl,
      approved_by_owner: false,
      manual_execution_required: true
    }
  });
}

export async function getProductWorkspace(slug: string, options: DismissalOptions = {}) {
  const seed = getProduct(slug);

  if (!seed) {
    return null;
  }

  const postDraft = buildPostDraft(seed);
  const leadBrief = buildLeadResearchBrief(seed);

  if (!hasDatabaseUrl()) {
    return {
      product: seed,
      dbConnected: false,
      postDraft,
      leadBrief,
      providerStatus: getLeadSearchProviderStatus(),
      recentPosts: [],
      recentOutreachDrafts: [],
      recentLeads: [],
      memoryInsights: [],
      recentCampaigns: [],
      approvalItems: [],
      showDismissed: Boolean(options.showDismissed)
    };
  }

  try {
    const product = await ensureProductRecord(slug);

    if (!product) {
      throw new Error("Product not found");
    }

    const [recentPosts, recentOutreachDrafts, recentLeads, memoryInsights, recentCampaigns, approvalItems] = await Promise.all([
      prisma.socialPostDraft.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { assets: { orderBy: { createdAt: "desc" }, take: 3 } }
      }),
      prisma.outreachDraft.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { lead: true, campaign: true }
      }),
      prisma.lead.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { contactVerification: true }
      }),
      prisma.agencyMemory.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.campaign.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.approvalItem.findMany({
        where: {
          productId: product.id,
          approved_by_owner: false
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { campaign: true }
      })
    ]);

    const dismissedKeys = await getDismissedCardKeys([
      ...recentPosts.map((item: any) => ({ itemType: "social_post_draft", itemId: item.id })),
      ...recentOutreachDrafts.map((item: any) => ({ itemType: "outreach_draft", itemId: item.id })),
      ...recentLeads.map((item: any) => ({ itemType: "lead", itemId: item.id })),
      ...memoryInsights.map((item: any) => ({ itemType: "agency_memory", itemId: item.id })),
      ...recentCampaigns.map((item: any) => ({ itemType: "campaign", itemId: item.id })),
      ...approvalItems.map((item: any) => ({ itemType: "approval_item", itemId: item.id }))
    ]);

    return {
      product: seed,
      dbConnected: true,
      postDraft,
      leadBrief,
      providerStatus: getLeadSearchProviderStatus(),
      recentPosts: withDismissalMeta(recentPosts as any[], "social_post_draft", dismissedKeys, options.showDismissed),
      recentOutreachDrafts: withDismissalMeta(recentOutreachDrafts as any[], "outreach_draft", dismissedKeys, options.showDismissed),
      recentLeads: withDismissalMeta(recentLeads as any[], "lead", dismissedKeys, options.showDismissed),
      memoryInsights: withDismissalMeta(memoryInsights as any[], "agency_memory", dismissedKeys, options.showDismissed),
      recentCampaigns: withDismissalMeta(recentCampaigns as any[], "campaign", dismissedKeys, options.showDismissed),
      approvalItems: withDismissalMeta(approvalItems as any[], "approval_item", dismissedKeys, options.showDismissed),
      showDismissed: Boolean(options.showDismissed)
    };
  } catch {
    return {
      product: seed,
      dbConnected: false,
      postDraft,
      leadBrief,
      providerStatus: getLeadSearchProviderStatus(),
      recentPosts: [],
      recentOutreachDrafts: [],
      recentLeads: [],
      memoryInsights: [],
      recentCampaigns: [],
      approvalItems: [],
      showDismissed: Boolean(options.showDismissed)
    };
  }
}

export async function getCampaignDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        product: true,
        leads: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        socialPostDrafts: {
          orderBy: { createdAt: "desc" }
        },
        outreachDrafts: {
          orderBy: { createdAt: "desc" }
        },
        approvalItems: {
          orderBy: { createdAt: "desc" }
        },
        manualTrackingEntries: {
          orderBy: { createdAt: "desc" },
          take: 10
        },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  } catch {
    return null;
  }
}

export async function getSocialPostDraftDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.socialPostDraft.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true,
        assets: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  } catch {
    return null;
  }
}

export async function getApprovalItemDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    const item = await prisma.approvalItem.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true,
        lead: true
      }
    });

    if (
      !item ||
      (item.itemType !== "social_post_draft" && item.itemType !== "content_studio_facebook_post")
    ) {
      return item;
    }

    const socialPostDraft = await prisma.socialPostDraft.findUnique({
      where: { id: item.itemId },
      include: {
        product: true,
        campaign: true,
        assets: {
          orderBy: { createdAt: "desc" },
          take: 3
        },
        publishLogs: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    return {
      ...item,
      socialPostDraft
    };
  } catch {
    return null;
  }
}

export async function getOperatingData(filter: ProductFilter = "all", options: DismissalOptions = {}) {
  if (!hasDatabaseUrl()) {
    return {
      dbConnected: false,
      productFilter: filter,
      productFilterLabel: getProductFilterLabel(filter),
      products,
      campaigns: [],
      leads: [],
      websiteAnalyses: [],
      contactVerifications: [],
      outreachDrafts: [],
      socialPostDrafts: [],
      approvalItems: [],
      manualTrackingEntries: [],
      experiments: [],
      agencyMemories: [],
      reports: [],
      showDismissed: Boolean(options.showDismissed)
    };
  }

  try {
    const [
      campaigns,
      leads,
      websiteAnalyses,
      contactVerifications,
      outreachDrafts,
      socialPostDrafts,
      approvalItems,
      manualTrackingEntries,
      experiments,
      agencyMemories,
      reports
    ] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { product: true }
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          product: true,
          campaign: true,
          leadAnalysis: true,
          contactVerification: true,
          outreachDrafts: true
        }
      }),
      prisma.leadAnalysis.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { lead: { include: { product: true } } }
      }),
      prisma.contactVerification.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { lead: { include: { product: true } } }
      }),
      prisma.outreachDraft.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { product: true, lead: true, campaign: true }
      }),
      prisma.socialPostDraft.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          product: true,
          campaign: true,
          assets: { orderBy: { createdAt: "desc" }, take: 3 },
          // Publish history — newest first, capped at 5 to keep payloads small.
          // Provider/status/createdAt/error/providerPostId only — no tokens.
          publishLogs: { orderBy: { attemptedAt: "desc" }, take: 5 }
        }
      }),
      prisma.approvalItem.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { product: true, campaign: true, lead: true }
      }),
      prisma.manualTrackingEntry.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { product: true, campaign: true, lead: true }
      }),
      prisma.experiment.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { product: true, campaign: true }
      }),
      prisma.agencyMemory.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { product: true, campaign: true }
      }),
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { product: true, campaign: true }
      })
    ]);

    const filteredCampaigns = campaigns.filter((campaign: any) => matchesProductFilter(campaign, filter));
    const filteredLeads = leads.filter((lead: any) => matchesProductFilter(lead, filter));
    const filteredWebsiteAnalyses = websiteAnalyses.filter((analysis: any) =>
      filter === "all" ? true : filter === "global" ? false : analysis.lead?.product?.slug === filter
    );
    const filteredContactVerifications = contactVerifications.filter((verification: any) =>
      filter === "all" ? true : filter === "global" ? false : verification.lead?.product?.slug === filter
    );
    const filteredOutreachDrafts = outreachDrafts.filter((draft: any) => matchesProductFilter(draft, filter));
    const filteredSocialPostDrafts = socialPostDrafts.filter((post: any) => matchesProductFilter(post, filter));
    const filteredApprovalItems = approvalItems.filter((item: any) => matchesProductFilter(item, filter));
    const filteredManualTrackingEntries = manualTrackingEntries.filter((entry: any) =>
      matchesProductFilter(entry, filter)
    );
    const filteredExperiments = experiments.filter((experiment: any) => matchesProductFilter(experiment, filter));
    const filteredAgencyMemories = agencyMemories.filter((memory: any) => matchesProductFilter(memory, filter));
    const filteredReports = reports.filter((report: any) => matchesProductFilter(report, filter));

    const dismissedKeys = await getDismissedCardKeys([
      ...filteredCampaigns.map((item: any) => ({ itemType: "campaign", itemId: item.id })),
      ...filteredLeads.map((item: any) => ({ itemType: "lead", itemId: item.id })),
      ...filteredOutreachDrafts.map((item: any) => ({ itemType: "outreach_draft", itemId: item.id })),
      ...filteredSocialPostDrafts.map((item: any) => ({ itemType: "social_post_draft", itemId: item.id })),
      ...filteredApprovalItems.map((item: any) => ({ itemType: "approval_item", itemId: item.id })),
      ...filteredManualTrackingEntries.map((item: any) => ({ itemType: "manual_tracking_entry", itemId: item.id })),
      ...filteredExperiments.map((item: any) => ({ itemType: "experiment", itemId: item.id })),
      ...filteredAgencyMemories.map((item: any) => ({ itemType: "agency_memory", itemId: item.id })),
      ...filteredReports.map((item: any) => ({ itemType: "report", itemId: item.id }))
    ]);

    return {
      dbConnected: true,
      productFilter: filter,
      productFilterLabel: getProductFilterLabel(filter),
      products,
      campaigns: withDismissalMeta(filteredCampaigns as any[], "campaign", dismissedKeys, options.showDismissed),
      leads: withDismissalMeta(filteredLeads as any[], "lead", dismissedKeys, options.showDismissed),
      websiteAnalyses: filteredWebsiteAnalyses,
      contactVerifications: filteredContactVerifications,
      outreachDrafts: withDismissalMeta(filteredOutreachDrafts as any[], "outreach_draft", dismissedKeys, options.showDismissed),
      socialPostDrafts: withDismissalMeta(filteredSocialPostDrafts as any[], "social_post_draft", dismissedKeys, options.showDismissed),
      approvalItems: withDismissalMeta(filteredApprovalItems as any[], "approval_item", dismissedKeys, options.showDismissed),
      manualTrackingEntries: withDismissalMeta(filteredManualTrackingEntries as any[], "manual_tracking_entry", dismissedKeys, options.showDismissed),
      experiments: withDismissalMeta(filteredExperiments as any[], "experiment", dismissedKeys, options.showDismissed),
      agencyMemories: withDismissalMeta(filteredAgencyMemories as any[], "agency_memory", dismissedKeys, options.showDismissed),
      reports: withDismissalMeta(filteredReports as any[], "report", dismissedKeys, options.showDismissed),
      showDismissed: Boolean(options.showDismissed)
    };
  } catch {
    return {
      dbConnected: false,
      productFilter: filter,
      productFilterLabel: getProductFilterLabel(filter),
      products,
      campaigns: [],
      leads: [],
      websiteAnalyses: [],
      contactVerifications: [],
      outreachDrafts: [],
      socialPostDrafts: [],
      approvalItems: [],
      manualTrackingEntries: [],
      experiments: [],
      agencyMemories: [],
      reports: [],
      showDismissed: Boolean(options.showDismissed)
    };
  }
}

export async function getLeadDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true,
        leadAnalysis: true,
        contactVerification: true,
        outreachDrafts: {
          orderBy: { createdAt: "desc" }
        },
        approvalItems: {
          orderBy: { createdAt: "desc" }
        },
        manualTrackingEntries: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  } catch {
    return null;
  }
}

export async function getWebsiteAnalysisDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.leadAnalysis.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            product: true,
            contactVerification: true
          }
        }
      }
    });
  } catch {
    return null;
  }
}

export async function getOutreachDraftDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.outreachDraft.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true,
        lead: {
          include: {
            leadAnalysis: true,
            contactVerification: true
          }
        }
      }
    });
  } catch {
    return null;
  }
}

export async function getReportDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.report.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true
      }
    });
  } catch {
    return null;
  }
}

export async function getExperimentDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.experiment.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true
      }
    });
  } catch {
    return null;
  }
}

export async function getMemoryDetail(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return prisma.agencyMemory.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true
      }
    });
  } catch {
    return null;
  }
}
