import Link from "next/link";
import { runAgencyBrainAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getAgencyBrainRuns } from "@/lib/agency-brain";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";
import { products } from "@/lib/product-data";
import { duplicateRiskAr, statusAr } from "@/lib/ui-ar";
import { AgencyBrainOutput, agencyBrainOutputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const objectives = [
  ["daily_review", "مراجعة يومية"],
  ["campaign_idea", "فكرة حملة"],
  ["outreach_idea", "فكرة تواصل"],
  ["social_idea", "فكرة محتوى اجتماعي"],
  ["lead_research_direction", "اتجاه بحث العملاء"],
  ["duplicate_check", "فحص التكرار"],
  ["messaging_review", "مراجعة الرسائل"]
] as const;

function extractOutput(markdown: string): AgencyBrainOutput | null {
  const match = markdown.match(/```json\s*([\s\S]*?)```/);

  if (!match) {
    return null;
  }

  try {
    return agencyBrainOutputSchema.parse(JSON.parse(match[1]));
  } catch {
    return null;
  }
}

export default async function AgencyBrainPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; report?: string }>;
}) {
  const [params, runs] = await Promise.all([searchParams, getAgencyBrainRuns()]);
  const selectedRun = runs.find((run) => run.id === params.report) ?? runs[0];
  const output = selectedRun ? extractOutput(selectedRun.markdown) : null;
  const providerStatus = getLeadSearchProviderStatus();

  return (
    <AppShell>
      <Notice code={params.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">تفكير واعٍ بسياق المنتج</div>
            <h1 className="page-title">عقل الوكالة</h1>
            <p className="muted">
              طبقة تفكير استراتيجية: تقترح، تقارن، وتحفظ توصيات كمسودات.
              لا ترسل ولا تنشر ولا تتواصل مع أي جهة.
            </p>
          </div>
          <span className="badge warning">موافقة يدوية مطلوبة</span>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">تشغيل التحليل</h2>
            <form action={runAgencyBrainAction} className="stack">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="scope">النطاق</label>
                  <select id="scope" name="scope" required defaultValue="">
                    <option value="" disabled>
                      اختر النطاق
                    </option>
                    <option value="global">عام</option>
                    {products.map((product) => (
                      <option key={product.slug} value={product.slug}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="objective">الهدف</label>
                  <select id="objective" name="objective" required defaultValue="daily_review">
                    {objectives.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="button" type="submit">
                <Icons.brain size={18} />
                تشغيل التحليل
              </button>
              <p className="muted">
                يحمّل التشغيل سياق المنتج والذاكرة والحملات والمسودات والعملاء الذين تم التواصل معهم
                والموافقات والتقارير. يتم التحقق من الخرج المنظم قبل حفظ أي شيء.
              </p>
            </form>
          </div>

          <div className="panel">
            <h2 className="section-title">حدود السلامة</h2>
            <ul className="list bullets">
              <li className={providerStatus.openAiConfigured ? "" : "warning-text"}>
                OpenAI: {providerStatus.openAiConfigured ? "مضبوط" : "غير موجود"}
              </li>
              <li className={providerStatus.providerConfigured ? "" : "warning-text"}>
                مزوّد بحث العملاء: {providerStatus.providerConfigured ? "مضبوط" : "غير موجود"}
              </li>
              <li>لا يوجد إرسال تلقائي.</li>
              <li>لا يوجد نشر تلقائي.</li>
              <li>لا يوجد تواصل تلقائي مع العملاء.</li>
              <li>لا توجد ادعاءات وهمية أو نتائج غير مدعومة.</li>
              <li>مصدر رسمي للشركة مطلوب قبل أي مسار تواصل حقيقي.</li>
              <li>يبقى مركز الموافقات بوابة المالك اليدوية.</li>
            </ul>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">التشغيلات الأخيرة</h2>
            {runs.length === 0 ? (
              <p className="muted">لا توجد تشغيلات لعقل الوكالة بعد.</p>
            ) : (
              <div className="stack">
                {runs.map((run) => (
                  <Link className="panel subtle" href={`/agency-brain?report=${run.id}`} key={run.id}>
                    <div className="split-row">
                      <strong>{run.title}</strong>
                      <span className="badge warning">{statusAr(run.status)}</span>
                    </div>
                    <p className="muted">{run.product?.name ?? "عام"}</p>
                    <p>{run.summary}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">النتيجة المحددة</h2>
            {!selectedRun || !output ? (
              <p className="muted">شغّل عقل الوكالة لعرض التوصيات المنظمة هنا.</p>
            ) : (
              <div className="stack">
                <div className="split-row">
                  <strong>{output.scope === "global" ? "عام" : selectedRun.product?.name}</strong>
                  <span className="badge">{objectives.find(([value]) => value === output.objective)?.[1] ?? output.objective}</span>
                </div>
                <p>{output.summary}</p>
                <p className="muted">{output.reasoning}</p>
                <Link className="button secondary" href={`/reports/${selectedRun.id}`}>
                  <Icons.file size={18} />
                  فتح التقرير المحفوظ
                </Link>
              </div>
            )}
          </div>
        </section>

        {output ? (
          <section className="panel">
            <div className="split-row">
              <div>
                <h2 className="section-title">التوصيات</h2>
                <p className="muted">التوصيات التي تحتاج موافقة تُرسل إلى مركز الموافقات.</p>
              </div>
              <Link className="button secondary" href="/approval-center">
                <Icons.approval size={18} />
                مركز الموافقات
              </Link>
            </div>
            <div className="stack">
              {output.recommendations.map((recommendation) => (
                <div className="panel subtle" key={`${recommendation.type}-${recommendation.title}`}>
                  <div className="split-row">
                    <strong>{recommendation.title}</strong>
                    <span className={`badge ${recommendation.duplicateRisk === "high" ? "warning" : ""}`}>
                      التكرار: {duplicateRiskAr(recommendation.duplicateRisk)}
                    </span>
                  </div>
                  <p>{recommendation.description}</p>
                  <div className="meta-grid">
                    <span>{recommendation.type}</span>
                    <span>{recommendation.channel}</span>
                    <span>{recommendation.targetAudience}</span>
                    <span>{recommendation.nextStep}</span>
                  </div>
                  <p className="muted">{recommendation.similarityNotes}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {output?.memoryUpdates.length ? (
          <section className="panel">
            <h2 className="section-title">تحديثات الذاكرة</h2>
            <div className="stack">
              {output.memoryUpdates.map((memory) => (
                <div className="panel subtle" key={`${memory.type}-${memory.title}`}>
                  <div className="split-row">
                    <strong>{memory.title}</strong>
                    <span className="badge">{memory.confidence}%</span>
                  </div>
                  <p className="muted">{memory.type}</p>
                  <p>{memory.content}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {output?.warnings.length ? (
          <section className="notice warning">
            <strong>تحذيرات</strong>
            <ul className="list bullets">
              {output.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
