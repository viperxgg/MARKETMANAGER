import Link from "next/link";
import { notFound } from "next/navigation";
import { updateApprovalDecisionAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { FacebookPublishForm } from "@/components/facebook-publish-button";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getApprovalItemDetail } from "@/lib/data-service";
import { isFacebookConfigured } from "@/lib/integrations/facebook/client";
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
      <SubmitButton className={className} pendingLabel="جارٍ التحديث...">
        <Icons.check size={18} />
        {label}
      </SubmitButton>
    </form>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

  const socialPostDraft = "socialPostDraft" in item ? item.socialPostDraft : null;
  const canPublishFacebook =
    Boolean(socialPostDraft) &&
    socialPostDraft?.platform === "facebook" &&
    (item.itemType === "social_post_draft" || item.itemType === "content_studio_facebook_post");
  const facebookConfigured = isFacebookConfigured();
  const alreadyPublished = socialPostDraft?.status === "published" || Boolean(socialPostDraft?.providerPostId);
  const publishDisabled = !canPublishFacebook || !facebookConfigured || alreadyPublished;
  const publishDisabledReason = !canPublishFacebook
    ? "هذا العنصر ليس مسودة فيسبوك قابلة للنشر."
    : alreadyPublished
    ? "تم نشر هذه المسودة مسبقًا."
    : !facebookConfigured
    ? "Facebook not configured. أضف META_PAGE_ID و META_ACCESS_TOKEN على الخادم."
    : undefined;

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">مراجعة الموافقة</div>
            <h1 className="page-title">{item.itemType}</h1>
            <p className="muted">
              راجع المحتوى والمخاطر وقائمة الالتزام. النشر الخارجي لا يحدث إلا عبر زر Approve & Publish
              وبعد تأكيد المالك.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(item.status)}</span>
            <span className="badge">موافقة المالك: {String(item.approved_by_owner)}</span>
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
              <li>لا يوجد إرسال بريد من هذه اللوحة.</li>
              <li>نشر فيسبوك يتطلب زر Approve & Publish وتأكيدًا يدويًا.</li>
            </ul>
          </div>

          <div className="panel">
            <h2 className="section-title">قائمة الالتزام</h2>
            <ul className="list bullets">
              {item.complianceChecklist.map((check) => (
                <li key={check}>{check}</li>
              ))}
              <li>لا يتم عرض META_ACCESS_TOKEN أو أي سر في الواجهة.</li>
            </ul>
          </div>
        </section>

        {canPublishFacebook ? (
          <section className="grid two">
            <div className="panel social-preview">
              <div className="split-row">
                <strong>{socialPostDraft?.product.name}</strong>
                <span className="badge">{statusAr(socialPostDraft?.status)}</span>
              </div>
              <h2>{socialPostDraft?.hook}</h2>
              <p>{socialPostDraft?.body}</p>
              {socialPostDraft?.cta ? <p className="muted">{socialPostDraft.cta}</p> : null}
              {socialPostDraft?.hashtags.length ? (
                <p className="hashtags">{socialPostDraft.hashtags.map((tag) => `#${tag}`).join(" ")}</p>
              ) : null}
            </div>

            <div className="panel">
              <h2 className="section-title">Facebook publishing</h2>
              <div className="stack">
                <div className="split-row">
                  <span>META Graph API</span>
                  <span className={`badge ${facebookConfigured ? "" : "warning"}`}>
                    {facebookConfigured ? "configured" : "missing"}
                  </span>
                </div>
                <div className="split-row">
                  <span>Provider post id</span>
                  <strong>{socialPostDraft?.providerPostId ?? "not published"}</strong>
                </div>
                <div className="split-row">
                  <span>Published at</span>
                  <strong>{socialPostDraft?.publishedAt ? formatDate(socialPostDraft.publishedAt) : "not published"}</strong>
                </div>
                {socialPostDraft?.publishError ? (
                  <p className="warning-text">{socialPostDraft.publishError}</p>
                ) : null}
                {socialPostDraft?.publishLogs.length ? (
                  <div className="stack">
                    <strong>Publish attempts</strong>
                    {socialPostDraft.publishLogs.map((log) => (
                      <div className="panel subtle" key={log.id}>
                        <div className="split-row">
                          <span>{formatDate(log.attemptedAt)}</span>
                          <span className={`badge ${log.success ? "" : "warning"}`}>
                            {log.success ? "success" : "failed"}
                          </span>
                        </div>
                        <p className="muted">{log.providerPostId ?? log.error ?? "no provider result"}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <FacebookPublishForm
                  approvalId={item.id}
                  disabled={publishDisabled}
                  disabledReason={publishDisabledReason}
                  returnTo={`/approval-center/${item.id}`}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">إجراءات المراجعة</h2>
              <p className="muted">
                هذه الأزرار تغيّر حالة المراجعة الداخلية فقط. زر Approve & Publish أعلاه هو مسار نشر فيسبوك
                الوحيد، ولا يظهر إلا لمسودات فيسبوك.
              </p>
            </div>
          </div>
          <div className="button-row">
            <DecisionButton approvalId={item.id} decision="approve" label="موافقة فقط" variant="primary" />
            <DecisionButton approvalId={item.id} decision="request_revision" label="طلب تعديل" />
            <DecisionButton approvalId={item.id} decision="reject" label="رفض" variant="warning" />
            <DecisionButton approvalId={item.id} decision="mark_reviewed" label="وضع كمراجع" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
