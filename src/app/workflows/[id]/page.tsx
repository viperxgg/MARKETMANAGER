import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getWorkflowRunDetail } from "@/lib/workflow-runs";
import type { StepStatus, StepTrace } from "@/lib/workflows/types";

export const dynamic = "force-dynamic";

const stepStatusLabel: Record<StepStatus, string> = {
  pending: "قيد الانتظار",
  running: "قيد التشغيل",
  completed: "اكتمل",
  failed: "فشل",
  skipped: "تم تخطيه"
};

const stepStatusClass: Record<StepStatus, string> = {
  pending: "",
  running: "",
  completed: "",
  failed: "warning",
  skipped: ""
};

const runStatusLabel: Record<string, string> = {
  running: "قيد التشغيل",
  completed: "اكتمل",
  partial: "اكتمل جزئيًا",
  failed: "فشل"
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatDuration(ms?: number) {
  if (!ms || ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function StepCard({ step, index }: { step: StepTrace; index: number }) {
  const isFailed = step.status === "failed";
  return (
    <div className="panel subtle">
      <div className="split-row">
        <div>
          <div className="eyebrow">الخطوة {index + 1}</div>
          <strong>{step.name}</strong>
          <p className="muted">id: {step.id}</p>
        </div>
        <div className="button-row">
          <span className="badge">{formatDuration(step.durationMs)}</span>
          <span className={`badge ${stepStatusClass[step.status]}`}>
            {stepStatusLabel[step.status]}
          </span>
        </div>
      </div>

      {step.output !== undefined && step.status === "completed" && (
        <div className="stack">
          <strong>المخرجات</strong>
          <pre className="code-block">{formatJson(step.output)}</pre>
        </div>
      )}

      {step.warnings.length > 0 && (
        <div className="notice warning">
          <strong>تحذيرات:</strong>
          <ul className="list bullets">
            {step.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {isFailed && step.error && (
        <div className="notice error">
          <strong>خطأ:</strong>
          <pre className="code-block">{step.error}</pre>
        </div>
      )}
    </div>
  );
}

export default async function WorkflowRunDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const run = await getWorkflowRunDetail(id);

  if (!run) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">تشغيل سير عمل</div>
            <h1 className="page-title">{run.workflowId}</h1>
            <p className="muted">
              بدأ {formatDate(run.createdAt)} · شغّل بواسطة {run.triggeredBy}
              {run.productSlug ? ` · المنتج ${run.productSlug}` : ""}
            </p>
          </div>
          <div className="button-row">
            <span className="badge">
              {run.completedSteps}/{run.totalSteps} مكتملة
            </span>
            {run.failedSteps > 0 && (
              <span className="badge warning">{run.failedSteps} فشل</span>
            )}
            {run.skippedSteps > 0 && (
              <span className="badge">{run.skippedSteps} تم تخطيها</span>
            )}
            <span className={`badge ${run.status === "completed" ? "" : "warning"}`}>
              {runStatusLabel[run.status] ?? run.status}
            </span>
            <Link className="button secondary" href="/workflows">
              <Icons.file size={18} />
              العودة إلى السجل
            </Link>
          </div>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">السياق الأولي</h2>
            <pre className="code-block">{formatJson(run.context)}</pre>
          </div>
          <div className="panel">
            <h2 className="section-title">الحالة النهائية</h2>
            <pre className="code-block">{formatJson(run.finalState)}</pre>
          </div>
        </section>

        <section className="stack">
          <h2 className="section-title">جدول الخطوات</h2>
          {run.steps.length === 0 ? (
            <p className="muted">لا توجد خطوات مسجلة بعد.</p>
          ) : (
            run.steps.map((step, i) => <StepCard index={i} key={step.id} step={step} />)
          )}
        </section>
      </div>
    </AppShell>
  );
}
