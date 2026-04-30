import Link from "next/link";
import { notFound } from "next/navigation";
import { updateApprovalDecisionAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { Icons } from "@/components/icons";
import { getApprovalItemDetail } from "@/lib/data-service";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

function DecisionButton({
  approvalId,
  decision,
  label,
  variant = "secondary"
}: {
  approvalId: string;
  decision: "approve" | "request_revision" | "reject" | "mark_reviewed";
  label: string;
  variant?: "primary" | "secondary" | "warning";
}) {
  const className =
    variant === "primary" ? "button" : variant === "warning" ? "button warning" : "button secondary";

  return (
    <form action={updateApprovalDecisionAction}>
      <input name="approvalId" type="hidden" value={approvalId} />
      <input name="decision" type="hidden" value={decision} />
      <button className={className} type="submit">
        <Icons.check size={18} />
        {label}
      </button>
    </form>
  );
}

export default async function ApprovalItemDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const item = await getApprovalItemDetail(id);

  if (!item) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">مراجعة الموافقة</div>
            <h1 className="page-title">{item.itemType}</h1>
            <p className="muted">
              راجع المحتوى والمخاطر وقائمة الالتزام. الموافقة لا تشغّل إرسالًا أو نشرًا.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(item.status)}</span>
            <span className="badge">التنفيذ اليدوي مطلوب: نعم</span>
          </div>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">معاينة المحتوى</h2>
            <p>{item.contentPreview}</p>
            <div className="stack">
              <div className="split-row">
                <span>موافقة المالك</span>
                <strong>{String(item.approved_by_owner)}</strong>
              </div>
              <div className="split-row">
                <span>التنفيذ اليدوي مطلوب</span>
                <strong>{String(item.manual_execution_required)}</strong>
              </div>
              <div className="split-row">
                <span>الحالة النهائية</span>
                <strong>{statusAr(item.finalStatus)}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">السجلات المرتبطة</h2>
            <div className="stack">
              <div className="split-row">
                <span>المنتج</span>
                <strong>{item.product?.name ?? "عام"}</strong>
              </div>
              {item.campaign ? (
                <Link className="button secondary" href={`/campaigns/${item.campaign.id}`}>
                  <Icons.file size={18} />
                  فتح الحملة
                </Link>
              ) : null}
              {item.lead ? (
                <div className="panel subtle">
                  <strong>{item.lead.companyName}</strong>
                  <p className="muted">{item.lead.reasonForFit}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">تحذيرات المخاطر</h2>
            <ul className="list bullets">
              {item.riskWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              <li>لا يوجد إرسال مباشر من هذه اللوحة.</li>
              <li>لا يوجد نشر مباشر من هذه اللوحة.</li>
            </ul>
          </div>

          <div className="panel">
            <h2 className="section-title">قائمة الالتزام</h2>
            <ul className="list bullets">
              {item.complianceChecklist.map((check) => (
                <li key={check}>{check}</li>
              ))}
              <li>موافقة المالك مطلوبة قبل أي إجراء خارجي يدوي.</li>
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">إجراءات المراجعة</h2>
              <p className="muted">
                هذه الأزرار تغيّر حالة المراجعة الداخلية فقط. لا ترسل بريدًا، ولا تنشر منشورات،
                ولا تتواصل مع العملاء.
              </p>
            </div>
          </div>
          <div className="button-row">
            <DecisionButton approvalId={item.id} decision="approve" label="موافقة" variant="primary" />
            <DecisionButton approvalId={item.id} decision="request_revision" label="طلب تعديل" />
            <DecisionButton approvalId={item.id} decision="reject" label="رفض" variant="warning" />
            <DecisionButton approvalId={item.id} decision="mark_reviewed" label="وضع كمراجع" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
