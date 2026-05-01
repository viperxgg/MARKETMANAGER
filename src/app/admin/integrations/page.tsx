import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getDatabaseStatus } from "@/lib/db";
import { getEnvHealth } from "@/lib/env";
import { getIntegrationsOverview } from "@/lib/integrations";
import { requireOwner } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const integrationLabel: Record<string, string> = {
  openai: "OpenAI",
  facebook: "Facebook (Meta)",
  email: "Email (Resend)",
  github: "GitHub",
  vercel: "Vercel",
  leads: "Lead search"
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? "" : "warning"}`}>{label}</span>;
}

export default async function AdminIntegrationsPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  // Defence in depth — middleware already blocks unauthenticated access,
  // but admin pages re-assert ownership.
  await requireOwner();

  const params = await searchParams;
  const [overview, dbStatus, envHealth] = await Promise.all([
    getIntegrationsOverview(),
    getDatabaseStatus(),
    Promise.resolve(getEnvHealth())
  ]);

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">إدارة</div>
            <h1 className="page-title">حالة التكاملات</h1>
            <p className="muted">
              فحص فقط — لا يتم استدعاء أي API خارجي. يعرض ما إذا كان كل تكامل مضبوطًا (config) ومُفعّلًا (flag).
            </p>
          </div>
          <div className="button-row">
            <Link className="button secondary" href="/admin/test-email">
              <Icons.mail size={18} />
              اختبار البريد
            </Link>
            <Link className="button secondary" href="/admin/test-github">
              <Icons.file size={18} />
              اختبار GitHub
            </Link>
            <Link className="button secondary" href="/admin/test-vercel">
              <Icons.briefcase size={18} />
              اختبار Vercel
            </Link>
            <Link className="button secondary" href="/settings">
              <Icons.settings size={18} />
              الإعدادات الكاملة
            </Link>
          </div>
        </div>

        {/* Required environment health */}
        <section className="panel">
          <h2 className="section-title">المتغيرات المطلوبة</h2>
          <p className="muted">
            هذه المتغيرات إجبارية لتشغيل التطبيق. لا تُعرض القيم — فقط حالة الوجود.
          </p>
          <div className="stack">
            {envHealth.required.map((row) => (
              <div className="split-row" key={row.name}>
                <code>{row.name}</code>
                <StatusBadge ok={row.present} label={row.present ? "مضبوط" : "مفقود"} />
              </div>
            ))}
          </div>
          {!envHealth.allRequiredPresent && (
            <div className="notice error">
              متغيرات مطلوبة مفقودة. أضفها إلى ملف <code>.env</code> ثم أعد تشغيل التطبيق.
            </div>
          )}
        </section>

        {/* Database status */}
        <section className="panel">
          <h2 className="section-title">قاعدة البيانات</h2>
          <div className="split-row">
            <span>{dbStatus.label}</span>
            <StatusBadge ok={dbStatus.state === "connected"} label={dbStatus.state} />
          </div>
          <p className="muted">{dbStatus.message}</p>
        </section>

        {/* Integration registry */}
        <section className="panel">
          <h2 className="section-title">سجل التكاملات</h2>
          <div className="stack">
            {overview.map((item) => (
              <div className="panel subtle" key={item.id}>
                <div className="split-row">
                  <div>
                    <strong>{integrationLabel[item.id] ?? item.id}</strong>
                    <p className="muted">{item.description}</p>
                  </div>
                  <div className="button-row">
                    <StatusBadge
                      ok={item.status.configured}
                      label={item.status.configured ? "configured" : "missing config"}
                    />
                    <StatusBadge
                      ok={item.status.enabled}
                      label={item.status.enabled ? "enabled" : "disabled"}
                    />
                  </div>
                </div>

                <div className="split-row" style={{ marginTop: "0.75rem" }}>
                  <span className="muted">الأوامر المتاحة:</span>
                  <div className="button-row">
                    {item.commands.map((cmd) => (
                      <span className="badge" key={cmd}>
                        {item.id}.{cmd}
                      </span>
                    ))}
                  </div>
                </div>

                {item.status.detail && (
                  <p className="muted" style={{ marginTop: "0.5rem" }}>
                    {item.status.detail}
                  </p>
                )}

                {item.status.missingEnvVars.length > 0 && (
                  <div className="notice warning" style={{ marginTop: "0.75rem" }}>
                    <strong>متغيرات مفقودة:</strong>
                    <ul className="list bullets">
                      {item.status.missingEnvVars.map((v) => (
                        <li key={v}>
                          <code>{v}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="notice warning">
          <strong>تذكير الأمان:</strong> صفحة الفحص هذه لا ترسل أي طلب خارجي. لاختبار التكامل
          الفعلي، استخدم نقاط نهاية الاختبار المخصصة (مثل <code>/admin/test-email</code>) التي
          تتقيد بقائمة <code>AUTH_ALLOWED_EMAILS</code> ولا ترسل إلى أي عنوان آخر.
        </section>
      </div>
    </AppShell>
  );
}
