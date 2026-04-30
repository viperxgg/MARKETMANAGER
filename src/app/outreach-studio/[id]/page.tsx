import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getOutreachDraftDetail } from "@/lib/data-service";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export default async function OutreachDraftDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const draft = await getOutreachDraftDetail(id);

  if (!draft) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">معاينة مسودة التواصل</div>
            <h1 className="page-title">{draft.company}</h1>
            <p className="muted">مسودة تواصل سويدية للمراجعة. لا يتم إرسال أي بريد من هذه الصفحة.</p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(draft.status)}</span>
            <span className="badge">موافقة المالك: {String(draft.approved_by_owner)}</span>
          </div>
        </div>

        <section className="grid two">
          <article className="panel">
            <h2 className="section-title">{draft.subject}</h2>
            <pre className="code-block">{draft.bodyPreview}</pre>
          </article>

          <div className="panel">
            <h2 className="section-title">حالة الالتزام</h2>
            <ul className="list bullets">
              {draft.complianceChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
              <li>التنفيذ اليدوي مطلوب.</li>
              <li>إرسال البريد المباشر غير مفعّل.</li>
            </ul>
            <div className="button-row">
              {draft.lead ? (
                <Link className="button secondary" href={`/leads/${draft.lead.id}`}>
                  <Icons.target size={18} />
                  فتح العميل
                </Link>
              ) : null}
              {draft.campaign ? (
                <Link className="button secondary" href={`/campaigns/${draft.campaign.id}`}>
                  <Icons.file size={18} />
                  فتح الحملة
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">أجزاء المسودة</h2>
            <div className="stack">
              <p><strong>الافتتاحية:</strong> {draft.opening}</p>
              <p><strong>الملاحظة:</strong> {draft.observation}</p>
              <p><strong>الفرصة:</strong> {draft.opportunity}</p>
              <p><strong>ارتباط المنتج:</strong> {draft.productConnection}</p>
              <p><strong>دعوة الإجراء اللطيفة:</strong> {draft.softCta}</p>
              <p><strong>الخاتمة:</strong> {draft.closing}</p>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">سياق جهة الاتصال المتحقق منها</h2>
            {draft.lead?.contactVerification ? (
              <div className="stack">
                <p>{draft.lead.contactVerification.officialEmail}</p>
                <a className="button secondary" href={draft.lead.contactVerification.emailSourceUrl} rel="noreferrer" target="_blank">
                  <Icons.search size={18} />
                  فتح مصدر البريد
                </a>
              </div>
            ) : (
              <p className="muted">لا يوجد تحقق من جهة الاتصال مرفق.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
