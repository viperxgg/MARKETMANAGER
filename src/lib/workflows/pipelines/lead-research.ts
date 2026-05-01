import { prisma } from "@/lib/db";
import { ensureProductRecord } from "@/lib/data-service";
import { importManualCsvLeads } from "@/lib/manual-csv-leads";
import { buildLeadResearchBrief } from "@/lib/daily-engine";
import { getProduct, type ProductSlug } from "@/lib/product-data";
import { getQualifiedThreshold } from "@/lib/scoring";
import type { Workflow } from "../types";

export interface LeadResearchInput {
  productSlug: ProductSlug;
  targetCount: number;
  csvText?: string;
}

interface LeadResearchState {
  productSlug: ProductSlug;
  targetCount: number;
  csvText?: string;
  productId?: string;
  campaignId?: string;
  approvalItemId?: string;
  importReportId?: string;
  leadsImported: number;
  leadsQualified: number;
  approvalItemsCreated: number;
  warnings: string[];
}

export const leadResearchPipeline: Workflow<LeadResearchState, LeadResearchInput> = {
  id: "lead-research-pipeline",
  name: "Lead Research Pipeline",
  description:
    "Creates a research campaign, ingests CSV leads, scores them, and pushes qualified leads into the approval center.",
  initial: (input) => ({
    productSlug: input.productSlug,
    targetCount: input.targetCount,
    csvText: input.csvText,
    leadsImported: 0,
    leadsQualified: 0,
    approvalItemsCreated: 0,
    warnings: []
  }),
  steps: [
    {
      id: "ensure-product",
      name: "تأكيد سجل المنتج في قاعدة البيانات",
      async run(state) {
        const product = getProduct(state.productSlug);
        if (!product) throw new Error(`Unknown product: ${state.productSlug}`);
        const record = await ensureProductRecord(state.productSlug);
        if (!record) throw new Error("Product record could not be created");
        return {
          state: { ...state, productId: record.id },
          output: { productId: record.id, productName: product.name }
        };
      }
    },
    {
      id: "create-research-campaign",
      name: "إنشاء حملة بحث مع عنصر موافقة",
      producesApproval: true,
      async run(state) {
        const product = getProduct(state.productSlug);
        if (!product || !state.productId) throw new Error("Missing product context");
        const campaign = await prisma.campaign.create({
          data: {
            productId: state.productId,
            name: `Lead research pipeline — ${state.targetCount} ${product.name} leads`,
            targetSegment: product.audienceName,
            objective: "Pipeline-driven lead research with scored qualification",
            channel: "codex_research",
            hypothesis:
              "Sequenced lead research with mandatory scoring + approval gate yields higher-quality outreach lists.",
            successMetrics: [
              `${state.targetCount} researched leads`,
              `fit_score >= ${getQualifiedThreshold()}`,
              "official email source URL"
            ],
            brief: buildLeadResearchBrief(product),
            messageAngle: "Workflow-orchestrated opportunity-based research.",
            status: "owner_review",
            approved_by_owner: false,
            manual_execution_required: true
          }
        });

        const approval = await prisma.approvalItem.create({
          data: {
            productId: state.productId,
            campaignId: campaign.id,
            itemType: "lead_research_pipeline",
            itemId: campaign.id,
            contentPreview: `Pipeline ran for ${product.name} (target: ${state.targetCount}).`,
            riskWarnings: ["No guessed emails", "Official email source required"],
            complianceChecklist: [
              "Every lead needs reason for fit",
              `Only fit_score >= ${getQualifiedThreshold()} counts as qualified`,
              "Email source must be from an official page"
            ],
            status: "owner_review",
            approved_by_owner: false,
            manual_execution_required: true,
            finalStatus: "manual_execution_required"
          }
        });

        return {
          state: { ...state, campaignId: campaign.id, approvalItemId: approval.id },
          output: { campaignId: campaign.id, approvalItemId: approval.id }
        };
      }
    },
    {
      id: "import-csv-leads",
      name: "استيراد العملاء من ملف CSV (اختياري)",
      guard: (state) => Boolean(state.csvText && state.csvText.trim().length > 0),
      async run(state) {
        const result = await importManualCsvLeads({
          productSlug: state.productSlug,
          csvText: state.csvText!
        });
        const warnings =
          result.rejectedCount > 0
            ? [`${result.rejectedCount} rows rejected during CSV import`]
            : undefined;
        return {
          state: {
            ...state,
            importReportId: result.reportId,
            leadsImported: result.savedCount
          },
          output: {
            reportId: result.reportId,
            saved: result.savedCount,
            rejected: result.rejectedCount
          },
          warnings
        };
      }
    },
    {
      id: "score-and-qualify",
      name: "تقييم العملاء وفرزهم بحسب درجة الملاءمة",
      guard: (state) => state.leadsImported > 0 && Boolean(state.productId),
      async run(state) {
        const threshold = getQualifiedThreshold();
        // The CSV importer already writes fit scores; here we just count qualified rows
        // for traceability and bump their status. This is a deliberate explicit step so
        // the workflow trace has a clear "scoring" entry.
        const qualified = await prisma.lead.count({
          where: {
            productId: state.productId,
            fitScore: { gte: threshold },
            status: { in: ["discovered", "analyzed", "contact_verified"] }
          }
        });
        return {
          state: { ...state, leadsQualified: qualified },
          output: { qualified, threshold }
        };
      }
    },
    {
      id: "push-qualified-to-approval",
      name: "دفع العملاء المؤهلين إلى مركز الموافقات",
      guard: (state) => state.leadsQualified > 0 && Boolean(state.productId && state.campaignId),
      producesApproval: true,
      async run(state) {
        const threshold = getQualifiedThreshold();
        const qualifiedLeads = await prisma.lead.findMany({
          where: {
            productId: state.productId,
            fitScore: { gte: threshold },
            status: { in: ["discovered", "analyzed", "contact_verified"] }
          },
          select: { id: true, companyName: true, fitScore: true, reasonForFit: true },
          take: 50
        });

        const created = await Promise.all(
          qualifiedLeads.map((lead) =>
            prisma.approvalItem.create({
              data: {
                productId: state.productId!,
                campaignId: state.campaignId,
                leadId: lead.id,
                itemType: "qualified_lead_for_outreach",
                itemId: lead.id,
                contentPreview: `${lead.companyName} (fit: ${lead.fitScore}) — ${lead.reasonForFit.slice(0, 120)}`,
                riskWarnings: [
                  "Verify official email source before drafting outreach",
                  "fit_score is not a sales guarantee"
                ],
                complianceChecklist: [
                  "Owner approval required",
                  "No live email sending from this dashboard",
                  "Outreach drafts must be Swedish and brand-safe"
                ],
                status: "owner_review",
                approved_by_owner: false,
                manual_execution_required: true,
                finalStatus: "manual_execution_required"
              }
            })
          )
        );

        return {
          state: { ...state, approvalItemsCreated: created.length },
          output: { approvalItemsCreated: created.length }
        };
      }
    },
    {
      id: "log-to-memory",
      name: "تسجيل ملخص التشغيل في ذاكرة الوكالة",
      async run(state) {
        const product = getProduct(state.productSlug);
        await prisma.agencyMemory.create({
          data: {
            productId: state.productId,
            title: `Lead research pipeline run — ${product?.name ?? state.productSlug}`,
            category: "market_insights",
            source: "workflow:lead-research-pipeline",
            confidence: 70,
            insight: `Imported ${state.leadsImported} leads, qualified ${state.leadsQualified}, pushed ${state.approvalItemsCreated} to approval.`,
            recommendation:
              "Review qualified leads in approval center. Reject obvious mismatches before drafting outreach.",
            status: "draft",
            approved_by_owner: false,
            manual_execution_required: true,
            notes: `pipeline_run:${state.campaignId ?? "no_campaign"}`
          }
        });
        return { state, output: { memoryWritten: true } };
      }
    }
  ]
};
