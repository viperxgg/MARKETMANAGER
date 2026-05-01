import Link from "next/link";
import { runVercelTestAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getLatestExecutionLog } from "@/lib/execution-logs";
import { getIntegrationsOverview } from "@/lib/integrations";
import { requireOwner } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

interface DeploymentSummary {
  uid: string;
  url: string;
  state: string;
  createdAt: number;
  source: string;
  target: string | null;
}

interface VercelResult {
  deployments?: DeploymentSummary[];
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatTimestamp(ms: number) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}

export default async function AdminTestVercelPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireOwner();

  const params = await searchParams;
  const [overview, lastLog] = await Promise.all([
    getIntegrationsOverview(),
    getLatestExecutionLog("vercel", "latest_deployment")
  ]);
  const integration = overview.find((i) => i.id === "vercel");
  const enabled = Boolean(integration?.status.enabled);
  const configured = Boolean(integration?.status.configured);
  const canTest = enabled && configured;

  const result = (lastLog?.result as VercelResult | null) ?? null;
  const ok = lastLog?.status === "succeeded";
  const deployments = result?.deployments ?? [];

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">إدارة — اختبار للقراءة فقط</div>
            <h1 className="page-title">اختبار Vercel</h1>
            <p className="muted">
              يستدعي <code>vercel.latest_deployment</code> فقط (قراءة). لا يطلق أي نشر — لا يوجد أمر deploy في الكود.
            </p>
          </div>
          <Link className="button secondary" href="/admin/integrations">
            <Icons.settings size={18} />
            عودة إلى حالة التكاملات
          </Link>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الحالة</h2>
            <div className="stack">
              <div className="split-row">
                <span>VERCEL_TOKEN + VERCEL_PROJECT_ID</span>
                <span className={`badge ${configured ? "" : "warning"}`}>
                  {configured ? "مضبوط" : "ناقص"}
                </span>
              </div>
              <div className="split-row">
                <span>ENABLE_VERCEL</span>
                <span className={`badge ${enabled ? "" : "warning"}`}>
                  {enabled ? "مفعّل" : "غير مفعّل"}
                </span>
              </div>
            </div>
            {!enabled && (
              <div className="notice warning">
                مع <code>ENABLE_VERCEL=false</code> لن يحدث استدعاء فعلي. سيُسجَّل
                التشغيل في <code>ExecutionLog</code> فقط.
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">الأوامر المتاحة</h2>
            <pre className="code-block">{`vercel.latest_deployment
input:  { limit: 5 }
output: { deployments: [{ uid, url, state, createdAt, source, target }] }
requiresApproval: false   # read-only

(لا يوجد أمر deploy. النشر يتم من Vercel CLI أو من Git push كالمعتاد.)`}</pre>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">التشغيل</h2>
          <form action={runVercelTestAction}>
            <SubmitButton
              className="button"
              disabled={!canTest}
              pendingLabel="جارٍ استدعاء Vercel..."
            >
              <Icons.search size={18} />
              قراءة آخر النشرات
            </SubmitButton>
          </form>
        </section>

        <section className="panel">
          <h2 className="section-title">آخر استدعاء (من ExecutionLog)</h2>
          {!lastLog ? (
            <p className="muted">لم يُجرَ أي اختبار بعد.</p>
          ) : (
            <div className="stack">
              <div className="split-row">
                <span>الحالة</span>
                <span className={`badge ${ok ? "" : "warning"}`}>{lastLog.status}</span>
              </div>
              <div className="split-row">
                <span>الوقت</span>
                <span>{formatDate(lastLog.completedAt ?? lastLog.createdAt)}</span>
              </div>
              <div className="split-row">
                <span>المدة</span>
                <span>{lastLog.durationMs ? `${lastLog.durationMs}ms` : "—"}</span>
              </div>
              {ok && deployments.length > 0 && (
                <div className="stack">
                  <strong>آخر النشرات</strong>
                  {deployments.map((d) => (
                    <div className="panel subtle" key={d.uid}>
                      <div className="split-row">
                        <strong>{d.target ?? "preview"}</strong>
                        <span className={`badge ${d.state === "READY" ? "" : "warning"}`}>{d.state}</span>
                      </div>
                      <p className="muted">
                        {d.url} · {formatTimestamp(d.createdAt)} · {d.source}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {!ok && lastLog.error && (
                <div className="notice error">
                  <strong>خطأ:</strong>
                  <pre className="code-block">{lastLog.error}</pre>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
