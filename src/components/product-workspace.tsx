import Link from "next/link";
import { generateFacebookPostAction } from "@/app/actions";
import { parseContentStudioNotes } from "@/lib/content-studio";
import { channelAr, duplicateRiskAr, statusAr } from "@/lib/ui-ar";
import { Icons } from "./icons";
import { SubmitButton } from "./submit-button";

type ProductWorkspaceData = NonNullable<Awaited<ReturnType<typeof import("@/lib/data-service").getProductWorkspace>>>;

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function EmptyState({ text }: { text: string }) {
  return <p className="muted">{text}</p>;
}

export function ProductWorkspace({ data }: { data: ProductWorkspaceData }) {
  const { product, providerStatus } = data;
  const generatedPosts = data.recentPosts
    .map((post: any) => ({ post, output: parseContentStudioNotes(post.notes) }))
    .filter((item: any) => item.output);
  const missingWarnings = [
    !providerStatus.openAiConfigured ? "OpenAI غير مضبوط: توليد الذكاء الاصطناعي سيتوقف بأمان." : "",
    !providerStatus.providerConfigured ? "مزوّد بحث العملاء غير مضبوط: لن يتم إنشاء عملاء وهميين." : "",
    providerStatus.providerConfigured && !providerStatus.providerImplemented
      ? "مزوّد البحث مضبوط لكن لا يوجد محوّل حي مطبّق بعد."
      : ""
  ].filter(Boolean);

  return (
    <div className="stack large product-command">
      <section className="notice warning">
        النظام يقترح ويحفظ مسودات فقط. لا يوجد إرسال أو نشر أو تواصل خارجي بدون موافقة يدوية.
      </section>

      <div className="topbar">
        <div>
          <div className="eyebrow">مساحة عمل المنتج</div>
          <h1 className="page-title">{product.name}</h1>
          <p>{product.positioning}</p>
          <p className="muted">{product.targetAudience}</p>
        </div>
        <Link className="button secondary" href="/products">
          <Icons.sparkles size={18} />
          كل المنتجات
        </Link>
      </div>

      <section className="grid three">
        <div className="panel stat">
          <span className="muted">الحملات النشطة</span>
          <span className="stat-value">{data.recentCampaigns.length}</span>
        </div>
        <div className="panel stat">
          <span className="muted">موافقات معلقة</span>
          <span className="stat-value">{data.approvalItems.length}</span>
        </div>
        <div className="panel stat">
          <span className="muted">مسودات حديثة</span>
          <span className="stat-value">{data.recentPosts.length + data.recentOutreachDrafts.length}</span>
        </div>
      </section>

      {missingWarnings.length > 0 ? (
        <section className="panel">
          <h2 className="section-title">تنبيهات الإعداد</h2>
          <ul className="list bullets">
            {missingWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="muted">حالة مزوّد البحث: {providerStatus.providerName}</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="split-row">
          <div>
            <h2 className="section-title">مهام اليوم لهذا المنتج</h2>
            <p className="muted">كل زر يستخدم سياق {product.name} فقط ويحفظ الناتج كمسودة أو عنصر مراجعة.</p>
          </div>
        </div>
        <div className="button-row task-actions">
          <form action={generateFacebookPostAction}>
            <input name="productSlug" type="hidden" value={product.slug} />
            <SubmitButton pendingLabel="جارٍ إنشاء منشور فيسبوك...">
              <Icons.megaphone size={18} />
              إنشاء منشور فيسبوك
            </SubmitButton>
          </form>
          <Link className="button" href={`/products/${product.slug}/lead-research/live`}>
            <Icons.search size={18} />
            البحث عن عملاء اليوم
          </Link>
          <Link className="button secondary" href={`/outreach-studio?product=${product.slug}`}>
            <Icons.mail size={18} />
            إنشاء بريد تواصل
          </Link>
          <Link className="button secondary" href={`/approval-center?product=${product.slug}`}>
            <Icons.approval size={18} />
            مراجعة الموافقات
          </Link>
          <Link className="button secondary" href={`/agency-memory?product=${product.slug}`}>
            <Icons.brain size={18} />
            عرض الذاكرة
          </Link>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">ملخص سياق المنتج</h2>
          <div className="stack">
            <div>
              <strong>الجمهور</strong>
              <p className="muted">{product.audience}</p>
            </div>
            <div>
              <strong>نقاط الألم</strong>
              <ul className="list bullets">
                {product.painPoints.slice(0, 4).map((painPoint) => (
                  <li key={painPoint}>{painPoint}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>زوايا محتوى آمنة</strong>
              <div className="button-row">
                {product.contentAngles.slice(0, 4).map((angle) => (
                  <span className="badge" key={angle}>
                    {angle}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">الحملات النشطة</h2>
          {data.recentCampaigns.length === 0 ? (
            <EmptyState text="لا توجد حملات محفوظة لهذا المنتج بعد." />
          ) : (
            <div className="stack">
              {data.recentCampaigns.slice(0, 4).map((campaign: any) => (
                <div className="panel subtle" key={campaign.id}>
                  <div className="split-row">
                    <strong>{campaign.name}</strong>
                    <span className="badge warning">{statusAr(campaign.status)}</span>
                  </div>
                  <p className="muted">{channelAr(campaign.channel)} - {formatDate(campaign.createdAt)}</p>
                  <Link className="button secondary compact" href={`/campaigns/${campaign.id}`}>
                    فتح الحملة
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">آخر مسودات المحتوى</h2>
          {data.recentPosts.length === 0 ? (
            <EmptyState text="لا توجد مسودات محتوى بعد." />
          ) : (
            <div className="stack">
              {data.recentPosts.map((post: any) => {
                const generated = generatedPosts.find((item: any) => item.post.id === post.id)?.output;

                return (
                  <div className="panel subtle" key={post.id}>
                    <div className="split-row">
                      <strong>{generated?.contentAngle ?? post.hook}</strong>
                      <span className="badge warning">{statusAr(post.status)}</span>
                    </div>
                    <div className="meta-grid">
                      <span>{product.name}</span>
                      <span>{channelAr(post.platform)}</span>
                      <span>اللغة: {generated?.language ?? "غير محددة"}</span>
                      <span>خطر التكرار: {duplicateRiskAr(generated?.duplicateRisk) || "غير محدد"}</span>
                    </div>
                    <p className="muted">{post.body}</p>
                    <Link className="button secondary compact" href={`/social-studio/${post.id}`}>
                      معاينة المسودة
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="section-title">آخر مسودات التواصل</h2>
          {data.recentOutreachDrafts.length === 0 ? (
            <EmptyState text="لا توجد مسودات تواصل بعد." />
          ) : (
            <div className="stack">
              {data.recentOutreachDrafts.map((draft: any) => (
                <div className="panel subtle" key={draft.id}>
                  <div className="split-row">
                    <strong>{draft.company}</strong>
                    <span className="badge warning">{statusAr(draft.status)}</span>
                  </div>
                  <p className="muted">{draft.subject}</p>
                  <Link className="button secondary compact" href={`/outreach-studio/${draft.id}`}>
                    معاينة البريد
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">آخر العملاء المحتملين</h2>
          {data.recentLeads.length === 0 ? (
            <EmptyState text="لا يوجد عملاء محفوظون لهذا المنتج بعد." />
          ) : (
            <div className="stack">
              {data.recentLeads.map((lead: any) => (
                <div className="panel subtle" key={lead.id}>
                  <div className="split-row">
                    <strong>{lead.companyName}</strong>
                    <span className="badge">{lead.fitScore}%</span>
                  </div>
                  <p className="muted">{lead.bestEntryAngle || lead.reasonForFit}</p>
                  <Link className="button secondary compact" href={`/leads/${lead.id}`}>
                    فتح العميل
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="section-title">آخر الذاكرة والموافقات</h2>
          <div className="stack">
            <div>
              <strong>الذاكرة</strong>
              {data.memoryInsights.length === 0 ? (
                <EmptyState text="لا توجد ملاحظات ذاكرة بعد." />
              ) : (
                <div className="stack">
                  {data.memoryInsights.slice(0, 3).map((memory: any) => (
                    <div className="panel subtle" key={memory.id}>
                      <div className="split-row">
                        <strong>{memory.title}</strong>
                        <span className="badge">{memory.confidence}%</span>
                      </div>
                      <p className="muted">{memory.insight}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <strong>الموافقات</strong>
              {data.approvalItems.length === 0 ? (
                <EmptyState text="لا توجد موافقات معلقة." />
              ) : (
                <div className="stack">
                  {data.approvalItems.slice(0, 3).map((item: any) => (
                    <div className="panel subtle" key={item.id}>
                      <div className="split-row">
                        <strong>{item.itemType}</strong>
                        <span className="badge warning">{statusAr(item.status)}</span>
                      </div>
                      <p className="muted">{item.contentPreview}</p>
                      <Link className="button secondary compact" href={`/approval-center/${item.id}`}>
                        مراجعة العنصر
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">حدود الرسائل</h2>
        <ul className="list bullets">
          {[...product.prohibitedClaims, ...product.forbiddenMessaging].slice(0, 8).map((claim) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
