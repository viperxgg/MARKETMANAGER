import Link from "next/link";
import { notFound } from "next/navigation";
import { createContactVerificationAction, createOutreachDraftAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getLeadDetail } from "@/lib/data-service";
import { getProduct } from "@/lib/product-data";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>;

function buildSuggestedEmail(lead: LeadDetail) {
  const product = getProduct(lead.product.slug);
  const primaryAngle = product?.contentAngles[0] ?? lead.product.shortDescription;
  const subject = `${primaryAngle} för ${lead.companyName}`;
  const opening = `Hej ${lead.companyName},`;
  const observation = `Jag såg att ert företag kan ha ett relevant behov kopplat till ${product?.painPoints[0] ?? lead.product.problemSolved}.`;
  const opportunity =
    lead.bestEntryAngle ||
    `Det finns en möjlighet att göra arbetsflödet tydligare med ${primaryAngle.toLowerCase()}.`;
  const productConnection = `Vi arbetar med ${lead.product.name}: ${product?.positioning ?? lead.product.shortDescription}`;
  const softCta = `Om det är relevant kan jag skicka en kort genomgång som visar hur ${lead.product.name} fungerar i praktiken.`;
  const closing = "Vänliga hälsningar,\nAzzam";
  const optOutText =
    "Om det inte är relevant just nu är det bara att säga till, så följer jag inte upp igen.";
  const bodyPreview = [
    opening,
    "",
    observation,
    "",
    opportunity,
    "",
    productConnection,
    "",
    softCta,
    "",
    closing,
    "",
    optOutText
  ].join("\n");

  return {
    subject,
    opening,
    observation,
    opportunity,
    productConnection,
    softCta,
    closing,
    optOutText,
    bodyPreview
  };
}

export default async function LeadDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const lead = await getLeadDetail(id);

  if (!lead) {
    notFound();
  }

  const suggestedEmail = buildSuggestedEmail(lead);
  const canSaveOutreachDraft = lead.fitScore >= 85 && Boolean(lead.officialEmail && lead.emailSourceUrl);

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">تفاصيل العميل المحتمل</div>
            <h1 className="page-title">{lead.companyName}</h1>
            <p className="muted">
              راجع الملاءمة والتحقق من جهة الاتصال الرسمية وتحليل الموقع وحالة المسودة.
              لا يتم تنفيذ أي تواصل هنا.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(lead.status)}</span>
            <span className="badge">درجة الملاءمة: {lead.fitScore}</span>
          </div>
        </div>

        <section className="grid three">
          <div className="panel stat">
            <span className="muted">المنتج</span>
            <span className="stat-value compact">{lead.product.name}</span>
          </div>
          <div className="panel stat">
            <span className="muted">البريد الرسمي</span>
            <span className="stat-value compact">{lead.officialEmail ?? "غير موجود"}</span>
          </div>
          <div className="panel stat">
            <span className="muted">الوضع اليدوي</span>
            <span className="stat-value compact">مطلوب</span>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الملاءمة وزاوية الدخول</h2>
            <p>{lead.reasonForFit}</p>
            <p className="muted">{lead.bestEntryAngle}</p>
            <div className="button-row">
              <a className="button secondary" href={lead.website} rel="noreferrer" target="_blank">
                <Icons.search size={18} />
                فتح الموقع الرسمي
              </a>
              {lead.campaign ? (
                <Link className="button secondary" href={`/campaigns/${lead.campaign.id}`}>
                  <Icons.file size={18} />
                  فتح الحملة
                </Link>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">التحقق من جهة الاتصال</h2>
            {lead.contactVerification ? (
              <div className="stack">
                <p>{lead.contactVerification.officialEmail}</p>
                <a className="button secondary" href={lead.contactVerification.emailSourceUrl} rel="noreferrer" target="_blank">
                  <Icons.search size={18} />
                  فتح مصدر البريد
                </a>
              </div>
            ) : (
              <form action={createContactVerificationAction} className="stack">
                <input name="leadId" type="hidden" value={lead.id} />
                <div className="field">
                  <label>البريد الرسمي</label>
                  <input name="officialEmail" required type="email" />
                </div>
                <div className="field">
                  <label>رابط مصدر البريد</label>
                  <input name="emailSourceUrl" required type="url" />
                </div>
                <div className="field">
                  <label>صفحة مصدر البريد</label>
                  <input name="emailSourcePage" placeholder="Kontakt / Om oss / footer" required />
                </div>
                <div className="field">
                  <label>ثقة البريد</label>
                  <select name="emailConfidence">
                    <option value="high">مرتفعة</option>
                    <option value="medium">متوسطة</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>
                <div className="field">
                  <label>ملاحظات</label>
                  <textarea name="notes" />
                </div>
                <button className="button" type="submit">
                  <Icons.check size={18} />
                  التحقق من جهة الاتصال
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">بريد مخصص مقترح</h2>
              <p className="muted">
                مسودة سويدية مبنية على سبب الملاءمة وفرصة الموقع والتحقق الرسمي من جهة الاتصال.
                الحفظ ينشئ مسودة داخلية فقط.
              </p>
            </div>
            <div className="button-row">
              <span className="badge warning">مراجعة المالك بعد الحفظ</span>
              <span className="badge">التنفيذ اليدوي مطلوب</span>
            </div>
          </div>

          <div className="email-preview">
            <div className="email-subject">
              <span className="muted">الموضوع</span>
              <strong>{suggestedEmail.subject}</strong>
            </div>
            <pre className="code-block">{suggestedEmail.bodyPreview}</pre>
          </div>

          <form action={createOutreachDraftAction} className="button-row">
            <input name="leadId" type="hidden" value={lead.id} />
            <input name="subject" type="hidden" value={suggestedEmail.subject} />
            <input name="opening" type="hidden" value={suggestedEmail.opening} />
            <input name="observation" type="hidden" value={suggestedEmail.observation} />
            <input name="opportunity" type="hidden" value={suggestedEmail.opportunity} />
            <input name="productConnection" type="hidden" value={suggestedEmail.productConnection} />
            <input name="softCta" type="hidden" value={suggestedEmail.softCta} />
            <input name="closing" type="hidden" value={suggestedEmail.closing} />
            <input name="optOutText" type="hidden" value={suggestedEmail.optOutText} />
            <input name="bodyPreview" type="hidden" value={suggestedEmail.bodyPreview} />
            <button className="button" disabled={!canSaveOutreachDraft} type="submit">
              <Icons.mail size={18} />
              حفظ كمسودة تواصل
            </button>
            {!canSaveOutreachDraft ? (
              <span className="muted">
                يحتاج العميل إلى درجة ملاءمة 85 أو أكثر ومصدر بريد رسمي متحقق قبل إنشاء المسودة.
              </span>
            ) : null}
          </form>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">تحليل الموقع</h2>
            {lead.leadAnalysis ? (
              <div className="stack">
                <p>{lead.leadAnalysis.opportunityFraming}</p>
                <Link className="button secondary" href={`/website-analysis/${lead.leadAnalysis.id}`}>
                  <Icons.clipboard size={18} />
                  فتح التحليل
                </Link>
              </div>
            ) : (
              <Link className="button secondary" href="/website-analysis">
                <Icons.clipboard size={18} />
                إنشاء تحليل موقع
              </Link>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">مسودات التواصل</h2>
            {lead.outreachDrafts.length === 0 ? (
              <Link className="button secondary" href="/outreach-studio">
                <Icons.mail size={18} />
                إنشاء مسودة تواصل
              </Link>
            ) : (
              <div className="stack">
                {lead.outreachDrafts.map((draft) => (
                  <div className="panel subtle" key={draft.id}>
                    <div className="split-row">
                      <strong>{draft.subject}</strong>
                      <span className="badge warning">{statusAr(draft.status)}</span>
                    </div>
                    <Link className="button secondary" href={`/outreach-studio/${draft.id}`}>
                      <Icons.mail size={18} />
                      معاينة البريد
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
