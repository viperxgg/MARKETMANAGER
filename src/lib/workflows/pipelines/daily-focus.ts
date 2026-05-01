import { runAgent } from "@/agents";
import { ensureProductRecord } from "@/lib/data-service";
import { prisma } from "@/lib/db";
import { buildDailySummary } from "@/lib/daily-engine";
import { getProduct, type ProductSlug } from "@/lib/product-data";
import type { Workflow } from "../types";

export interface DailyFocusInput {
  productSlug?: ProductSlug;
}

interface DailyFocusState {
  productSlug?: ProductSlug;
  productId?: string;
  dailyRunId?: string;
  agentSummary?: string;
  agentRecommendations: string[];
  approvalItemsCreated: number;
  reportId?: string;
}

export const dailyFocusPipeline: Workflow<DailyFocusState, DailyFocusInput> = {
  id: "daily-focus-pipeline",
  name: "Daily Focus Pipeline",
  description:
    "Creates a daily run, asks the Marketing Strategist agent for recommendations, fans them out as approval items, and logs the summary.",
  initial: (input) => ({
    productSlug: input.productSlug,
    agentRecommendations: [],
    approvalItemsCreated: 0
  }),
  steps: [
    {
      id: "ensure-product",
      name: "تأكيد سجل المنتج (إن وُجد)",
      guard: (state) => Boolean(state.productSlug),
      async run(state) {
        const record = await ensureProductRecord(state.productSlug!);
        return {
          state: { ...state, productId: record?.id },
          output: { productId: record?.id ?? null }
        };
      }
    },
    {
      id: "create-daily-run",
      name: "إنشاء سجل التشغيل اليومي",
      async run(state) {
        const product = state.productSlug ? getProduct(state.productSlug) : undefined;
        const daily = buildDailySummary(product);
        const run = await prisma.dailyRun.create({
          data: {
            productId: state.productId,
            summary: daily.summary,
            recommendedActions: daily.recommendations,
            contentNeeded: true,
            leadsNeeded: true,
            status: "draft",
            approved_by_owner: false,
            manual_execution_required: true,
            warnings: ["Workflow-driven daily focus. Live sending and publishing remain disabled."]
          }
        });
        return {
          state: { ...state, dailyRunId: run.id },
          output: { dailyRunId: run.id }
        };
      }
    },
    {
      id: "run-strategist-agent",
      name: "استدعاء Marketing Strategist عبر منصة الوكلاء",
      async run(state, ctx) {
        const scope = state.productSlug ?? "global";
        const intent = `daily_review for ${scope}`;
        try {
          const { results } = await runAgent({
            intent,
            objective: "daily_review",
            payload: { scope },
            context: {
              productSlug: state.productSlug,
              operator: ctx.operator,
              dbAvailable: ctx.dbAvailable,
              dryRun: ctx.dryRun
            }
          });
          const primary = results[0]?.output as
            | { summary?: string; recommendations?: string[]; reportId?: string }
            | undefined;
          return {
            state: {
              ...state,
              agentSummary: primary?.summary ?? "",
              agentRecommendations: primary?.recommendations ?? [],
              reportId: primary?.reportId
            },
            output: {
              recommendationCount: primary?.recommendations?.length ?? 0,
              reportId: primary?.reportId
            }
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "agent call failed";
          return {
            state,
            output: { error: message },
            warnings: [`Strategist agent call failed: ${message}`]
          };
        }
      }
    },
    {
      id: "fan-out-approval-items",
      name: "تحويل التوصيات إلى عناصر مراجعة",
      guard: (state) => state.agentRecommendations.length > 0,
      producesApproval: true,
      async run(state) {
        const created = await Promise.all(
          state.agentRecommendations.slice(0, 8).map((rec, i) =>
            prisma.approvalItem.create({
              data: {
                productId: state.productId,
                itemType: "daily_focus_task",
                itemId: `daily_${state.dailyRunId ?? "preview"}_${i}`,
                contentPreview: rec.slice(0, 500),
                riskWarnings: ["Owner approval required before any external execution"],
                complianceChecklist: [
                  "Review against agency memory before approving",
                  "No live sending or publishing"
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
      name: "تسجيل ملخص اليوم في ذاكرة الوكالة",
      async run(state) {
        await prisma.agencyMemory.create({
          data: {
            productId: state.productId,
            title: `Daily focus pipeline — ${state.productSlug ?? "global"}`,
            category: "compliance_lessons",
            source: "workflow:daily-focus-pipeline",
            confidence: 75,
            insight:
              state.agentSummary ||
              "Daily focus run completed. Review approval center for today's tasks.",
            recommendation:
              `${state.approvalItemsCreated} approval items created from strategist recommendations. ` +
              "Review and approve before any execution.",
            status: "draft",
            approved_by_owner: false,
            manual_execution_required: true,
            notes: `pipeline_run:${state.dailyRunId ?? "preview"}`
          }
        });
        return { state, output: { memoryWritten: true } };
      }
    }
  ]
};
