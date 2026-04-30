import Link from "next/link";
import { notFound } from "next/navigation";
import { generateFacebookImageAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { getSocialPostDraftDetail } from "@/lib/data-service";
import { channelAr, statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

function platformLabel(platform: string) {
  if (platform === "facebook") {
    return "معاينة فيسبوك";
  }

  if (platform === "instagram") {
    return "معاينة إنستغرام";
  }

  if (platform === "linkedin") {
    return "معاينة لينكدإن";
  }

  return "معاينة المسودة";
}

export default async function SocialDraftDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const draft = await getSocialPostDraftDetail(id);

  if (!draft) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">معاينة مسودة اجتماعية</div>
            <h1 className="page-title">{platformLabel(draft.platform)}</h1>
            <p className="muted">
              راجع النص ودعوة الإجراء والوسوم ووصف الصورة. هذه مسودة فقط ولا يمكن نشرها تلقائيًا.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(draft.status)}</span>
            <span className="badge">موافقة المالك: {String(draft.approved_by_owner)}</span>
          </div>
        </div>

        <section className="grid two">
          <article className="panel social-preview">
            <div className="split-row">
              <strong>{draft.product.name}</strong>
              <span className="badge">{channelAr(draft.platform)}</span>
            </div>
            <h2>{draft.hook}</h2>
            <p>{draft.body}</p>
            <p className="muted">دعوة الإجراء: {draft.cta}</p>
            {draft.hashtags.length > 0 ? (
              <p className="hashtags">{draft.hashtags.map((tag) => `#${tag}`).join(" ")}</p>
            ) : null}
          </article>

          <div className="panel">
            <h2 className="section-title">بيانات المسودة</h2>
            <div className="stack">
              <div className="split-row">
                <span>المنتج</span>
                <strong>{draft.product.name}</strong>
              </div>
              <div className="split-row">
                <span>زاوية الحملة</span>
                <strong>{draft.campaignAngle}</strong>
              </div>
              <div className="split-row">
                <span>الجمهور</span>
                <strong>{draft.audience}</strong>
              </div>
              <div className="split-row">
                <span>نوع المنشور</span>
                <strong>{draft.postType}</strong>
              </div>
              <div className="split-row">
                <span>التنفيذ اليدوي مطلوب</span>
                <strong>{String(draft.manual_execution_required)}</strong>
              </div>
              {draft.campaign ? (
                <Link className="button secondary" href={`/campaigns/${draft.campaign.id}`}>
                  <Icons.file size={18} />
                  فتح الحملة
                </Link>
              ) : null}
              {draft.platform === "facebook" ? (
                <form action={generateFacebookImageAction}>
                  <input name="socialPostDraftId" type="hidden" value={draft.id} />
                  <input name="returnTo" type="hidden" value={`/social-studio/${draft.id}`} />
                  <SubmitButton pendingLabel="جارٍ توليد صورة فيسبوك...">
                    <Icons.image size={18} />
                    توليد صورة فيسبوك
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">وصف الصورة</h2>
            <p className="muted">{draft.imageConcept}</p>
            <pre className="code-block">{draft.imagePromptEn}</pre>
          </div>

          <div className="panel">
            <h2 className="section-title">أصول الصور المسودة</h2>
            {draft.assets.length === 0 ? (
              <p className="muted">لم يتم توليد صورة لهذا المنشور بعد. الصورة خطوة منفصلة ولا تحدث إلا عند ضغط الزر.</p>
            ) : (
              <div className="stack">
                {draft.assets.map((asset) => (
                  <div className="panel subtle" key={asset.id}>
                    <div className="split-row">
                      <strong>{asset.imageModel}</strong>
                      <span className="badge warning">{statusAr(asset.status)}</span>
                    </div>
                    {asset.imageUrl || asset.storedImageReference ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Facebook generated draft asset"
                        className="draft-image-preview"
                        src={asset.imageUrl ?? asset.storedImageReference ?? ""}
                      />
                    ) : null}
                    <pre className="code-block">{asset.imagePrompt}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
            <h2 className="section-title">حدود الصورة والادعاءات</h2>
            <ul className="list bullets">
              {draft.visualAvoid.map((item) => (
                <li key={item}>{item}</li>
              ))}
              <li>لا يوجد نشر تلقائي.</li>
              <li>لا يوجد تنفيذ عبر واجهات خارجية من هذه اللوحة.</li>
              <li>لا شعارات وهمية، ولا شهادات عملاء وهمية، ولا شارات رسمية غير قابلة للتحقق.</li>
            </ul>
        </section>
      </div>
    </AppShell>
  );
}
