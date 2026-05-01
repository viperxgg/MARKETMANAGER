import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { listRecentWorkflowRuns } from "@/lib/workflow-runs";
import { listWorkflows } from "@/lib/workflows";

export const dynamic = "force-dynamic";

const statusBadgeClass: Record<string, string> = {
  completed: "",
  partial: "warning",
  failed: "warning",
  running: ""
};

const statusLabel: Record<string, string> = {
  completed: "اكتمل",
  partial: "اكتمل جزئيًا",
  failed: "فشل",
  running: "قيد التشغيل"
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function WorkflowsPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; runId?: string }>;
}) {
  const params = await searchParams;
  const [runs, registered] = await Promise.all([
    listRecentWorkflowRuns(50),
    Promise.resolve(listWorkflows())
  ]);

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">سير العمل</div>
            <h1 className="page-title">سجل تشغيل سير العمل</h1>
            <p className="muted">
              كل سير عمل يربط عدة خطوات تلقائيًا. هذا السجل يعرض آخر التشغيلات وحالة كل خطوة.
            </p>
          </div>
        </div>

        <section className="panel">
          <h2 className="section-title">سير العمل المسجلة</h2>
          <div className="stack">
            {registered.map((w) => (
              <div className="split-row" key={w.id}>
                <div>
                  <strong>{w.name}</strong>
                  <p className="muted">{w.description}</p>
                </div>
                <span className="badge">{w.steps.length} خطوة</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">آخر التشغيلات</h2>
          {runs.length === 0 ? (
            <p className="muted">
              لا توجد تشغيلات بعد. شغّل سير عمل من لوحة التحكم أو صفحة بحث العملاء لرؤية النتائج هنا.
            </p>
          ) : (
            <div className="stack">
              {runs.map((run) => (
                <Link
                  className="panel subtle"
                  href={`/workflows/${run.id}`}
                  key={run.id}
                >
                  <div className="split-row">
                    <div>
                      <strong>{run.workflowId}</strong>
                      <p className="muted">
                        {formatDate(run.createdAt)} · {run.triggeredBy}
                        {run.productSlug ? ` · ${run.productSlug}` : ""}
                      </p>
                    </div>
                    <div className="button-row">
                      <span className="badge">
                        {run.completedSteps}/{run.totalSteps} خطوات مكتملة
                      </span>
                      {run.failedSteps > 0 && (
                        <span className="badge warning">{run.failedSteps} فشل</span>
                      )}
                      {run.skippedSteps > 0 && (
                        <span className="badge">{run.skippedSteps} تم تخطيها</span>
                      )}
                      <span className={`badge ${statusBadgeClass[run.status] ?? ""}`}>
                        {statusLabel[run.status] ?? run.status}
                      </span>
                      <Icons.file size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
