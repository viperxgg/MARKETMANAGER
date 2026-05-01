import Link from "next/link";
import { runTestEmailAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getAllowedEmails } from "@/lib/env";
import { getIntegrationsOverview } from "@/lib/integrations";
import { requireOwner } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function AdminTestEmailPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireOwner();

  const params = await searchParams;
  const allowed = getAllowedEmails();
  const overview = await getIntegrationsOverview();
  const email = overview.find((i) => i.id === "email");
  const enabled = Boolean(email?.status.enabled);
  const configured = Boolean(email?.status.configured);
  const canSend = enabled && configured && allowed.length > 0;

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">إدارة</div>
            <h1 className="page-title">اختبار بريد Resend</h1>
            <p className="muted">
              يُرسل بريدًا اختباريًا واحدًا بقالب ثابت إلى عنوان مدرج في{" "}
              <code>AUTH_ALLOWED_EMAILS</code> فقط. لا يمكن تخصيص الموضوع أو المحتوى.
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
                <span>RESEND_API_KEY + RESEND_FROM</span>
                <span className={`badge ${configured ? "" : "warning"}`}>
                  {configured ? "مضبوط" : "ناقص"}
                </span>
              </div>
              <div className="split-row">
                <span>ENABLE_EMAIL</span>
                <span className={`badge ${enabled ? "" : "warning"}`}>
                  {enabled ? "مفعّل" : "غير مفعّل"}
                </span>
              </div>
              <div className="split-row">
                <span>عناوين مسموح بها</span>
                <span className="badge">{allowed.length}</span>
              </div>
            </div>
            {!enabled && (
              <div className="notice warning">
                <strong>ENABLE_EMAIL=false:</strong> سيتم تسجيل المحاولة في{" "}
                <code>ExecutionLog</code> ولكن لن يُرسل أي بريد. فعّل المتغير في{" "}
                <code>.env</code> أو في إعدادات Vercel ثم أعد التحميل.
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">قالب البريد المرسل</h2>
            <pre className="code-block">
{`From:    (RESEND_FROM)
To:      <recipient on AUTH_ALLOWED_EMAILS>
Subject: [Smart Art AI] Integration test

If you received this, your Resend integration
is working correctly.

— Smart Art AI integration audit`}
            </pre>
            <p className="muted">
              لا يمكن تعديل المحتوى. الموضوع والنص مغلقان داخل الأمر <code>email.send_test_email</code>.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">إرسال الاختبار</h2>
          {allowed.length === 0 ? (
            <div className="notice error">
              <code>AUTH_ALLOWED_EMAILS</code> فارغ. أضف بريدك إلى المتغير قبل المتابعة.
            </div>
          ) : (
            <form action={runTestEmailAction} className="stack">
              <div className="field">
                <label htmlFor="to">المستلم (من القائمة المسموح بها فقط)</label>
                <select id="to" name="to" required defaultValue={allowed[0]}>
                  {allowed.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton
                className="button"
                disabled={!canSend}
                pendingLabel="جارٍ إرسال البريد الاختباري..."
              >
                <Icons.mail size={18} />
                إرسال بريد الاختبار
              </SubmitButton>
              {!canSend && (
                <p className="muted">
                  الزر معطّل لأن أحد الشروط غير مستوفى (ENABLE_EMAIL، أو RESEND_*، أو
                  AUTH_ALLOWED_EMAILS).
                </p>
              )}
            </form>
          )}
        </section>

        <section className="notice warning">
          <strong>ضمانات الأمان:</strong>
          <ul className="list bullets">
            <li>المسار محمي بـ <code>requireOwner()</code> — جلسة Google ضمن قائمة Whitelist مطلوبة.</li>
            <li>المستلم يُتحقق منه مرة في الإجراء، ومرة ثانية داخل الأمر نفسه.</li>
            <li>الموضوع والمحتوى ثابتان — لا يمكن للمستخدم حقن أي نص.</li>
            <li>كل محاولة تُسجَّل في <code>ExecutionLog</code> مع المستلم والنتيجة.</li>
            <li>مع <code>ENABLE_EMAIL=false</code>، لا يحدث أي اتصال شبكي بـ Resend.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
