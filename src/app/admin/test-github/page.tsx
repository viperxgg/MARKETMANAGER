import Link from "next/link";
import { runGithubTestAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getLatestExecutionLog } from "@/lib/execution-logs";
import { getIntegrationsOverview } from "@/lib/integrations";
import { requireOwner } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

interface CommitData {
  sha?: string;
  message?: string;
  author?: string;
  url?: string;
  date?: string;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminTestGithubPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireOwner();

  const params = await searchParams;
  const [overview, lastLog] = await Promise.all([
    getIntegrationsOverview(),
    getLatestExecutionLog("github", "latest_commit")
  ]);
  const integration = overview.find((i) => i.id === "github");
  const enabled = Boolean(integration?.status.enabled);
  const configured = Boolean(integration?.status.configured);
  const canTest = enabled && configured;

  const result = (lastLog?.result as CommitData | null) ?? null;
  const ok = lastLog?.status === "succeeded";

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">إدارة — اختبار للقراءة فقط</div>
            <h1 className="page-title">اختبار GitHub</h1>
            <p className="muted">
              يستدعي <code>github.latest_commit</code> فقط (قراءة). لا ينشئ Issues ولا يكتب أي شيء.
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
                <span>GITHUB_TOKEN + GITHUB_REPO</span>
                <span className={`badge ${configured ? "" : "warning"}`}>
                  {configured ? "مضبوط" : "ناقص"}
                </span>
              </div>
              <div className="split-row">
                <span>ENABLE_GITHUB</span>
                <span className={`badge ${enabled ? "" : "warning"}`}>
                  {enabled ? "مفعّل" : "غير مفعّل"}
                </span>
              </div>
            </div>
            {!enabled && (
              <div className="notice warning">
                مع <code>ENABLE_GITHUB=false</code> لن يحدث استدعاء فعلي. سيُسجَّل
                التشغيل في <code>ExecutionLog</code> فقط.
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">الأمر المتاح</h2>
            <pre className="code-block">{`github.latest_commit
input:  { branch: "main" }
output: { sha, message, author, url, date }
requiresApproval: false   # read-only`}</pre>
            <p className="muted">
              <code>github.create_issue</code> موجود في الكود لكنه غير متاح من واجهة الاختبار. يلزم زر منفصل وإقرار صاحب الحساب.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">التشغيل</h2>
          <form action={runGithubTestAction}>
            <SubmitButton
              className="button"
              disabled={!canTest}
              pendingLabel="جارٍ استدعاء GitHub..."
            >
              <Icons.search size={18} />
              قراءة آخر commit
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
              {ok && result?.sha && (
                <>
                  <div className="split-row">
                    <span>SHA</span>
                    <code>{result.sha.slice(0, 12)}</code>
                  </div>
                  <div className="split-row">
                    <span>المؤلف</span>
                    <span>{result.author}</span>
                  </div>
                  <div className="split-row">
                    <span>الرسالة</span>
                    <span>{result.message}</span>
                  </div>
                  {result.url && (
                    <div className="split-row">
                      <span>رابط</span>
                      <a className="notice-link" href={result.url} rel="noreferrer" target="_blank">
                        فتح في GitHub ↗
                      </a>
                    </div>
                  )}
                </>
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
