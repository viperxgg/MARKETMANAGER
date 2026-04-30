import Link from "next/link";
import { notFound } from "next/navigation";
import { importManualCsvLeadsAction, rejectLiveResearchLeadAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { runLiveLeadResearch } from "@/lib/live-lead-research";
import { getProduct, products } from "@/lib/product-data";
import { duplicateRiskAr, statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export default async function LiveLeadResearchPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const result = await runLiveLeadResearch(product.slug);

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">بحث العملاء الحي</div>
            <h1 className="page-title">{product.name}: البحث عن عملاء اليوم</h1>
            <p className="muted">
              اكتشاف خاص بالمنتج فقط. لا يتم إرسال بريد، ولا يتم التواصل مع الشركات،
              وتبقى الموافقة يدوية.
            </p>
          </div>
          <Link className="button secondary" href={`/products/${product.slug}`}>
            <Icons.file size={18} />
            الرجوع إلى المنتج
          </Link>
        </div>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">خطوات البحث</h2>
              <p className="muted">جارٍ البحث عن أفضل عملاء اليوم...</p>
            </div>
            <span className="badge warning">مراجعة يدوية فقط</span>
          </div>
          <ol className="research-steps">
            {result.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">حالة المزوّد</h2>
            <div className="stack">
              <div className="split-row">
                <span>مزوّد بحث العملاء</span>
                <span className={result.providerStatus.providerConfigured ? "badge" : "badge warning"}>
                  {result.providerStatus.providerConfigured ? "مضبوط" : "غير موجود"}
                </span>
              </div>
              <div className="split-row">
                <span>محوّل المزوّد</span>
                <span className={result.providerStatus.providerImplemented ? "badge" : "badge warning"}>
                  {result.providerStatus.providerImplemented ? "مطبّق" : "غير مطبّق"}
                </span>
              </div>
              <div className="split-row">
                <span>OpenAI</span>
                <span className={result.providerStatus.openAiConfigured ? "badge" : "badge warning"}>
                  {result.providerStatus.openAiConfigured ? "مضبوط" : "غير موجود"}
                </span>
              </div>
              <p className="muted">المزوّد المحدد: {result.providerStatus.providerName}</p>
            </div>
          </div>
          <div className="panel">
            <h2 className="section-title">خيارات المزوّد المخططة</h2>
            <ul className="list bullets">
              {result.providerStatus.supportedProviders.map((provider) => (
                <li key={provider}>{provider}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="split-row">
            <div>
              <h2 className="section-title">استيراد CSV يدوي</h2>
              <p className="muted">
                ارفع شركات يوفّرها المالك لـ {product.name}. الأعمدة المطلوبة:
                companyName, website, officialEmail, businessType, city, notes.
              </p>
            </div>
            <span className="badge">manual-csv</span>
          </div>
          <form action={importManualCsvLeadsAction} className="stack">
            <input name="productSlug" type="hidden" value={product.slug} />
            <div className="field">
              <label>ملف CSV</label>
              <input accept=".csv,text/csv" name="csvFile" required type="file" />
            </div>
            <button className="button" type="submit">
              <Icons.search size={18} />
              استيراد CSV وتقييم العملاء
            </button>
          </form>
          <p className="muted">
            لا يتم التواصل مع أي جهة تلقائيًا. الصفوف المقبولة تصبح عملاء كمسودة،
            ورسائل سويدية كمسودة، وعناصر في مركز الموافقات فقط.
          </p>
        </section>

        {result.status === "missing_configuration" ? (
          <section className="panel">
            <h2 className="section-title">مزوّد البحث الحي غير موجود</h2>
            <p>{result.message}</p>
            <div className="stack">
              <strong>إعدادات خادم ناقصة</strong>
              <ul className="list bullets">
                {result.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="muted">
              يمكن لاحقًا ربط مزوّد حقيقي مثل Google Custom Search API أو SerpAPI أو Bing Web Search API
              أو الاستيراد اليدوي من CSV. لن يختلق التطبيق عملاء ولن ينشئ شركات من خيال الذكاء الاصطناعي.
            </p>
          </section>
        ) : (
          <>
            <section className="grid two">
              <div className="panel">
                <h2 className="section-title">ملخص البحث</h2>
                <p>{result.summary}</p>
              </div>
              <div className="panel">
                <h2 className="section-title">التعلم من التواصل السابق</h2>
                <p>{result.outreachLearning}</p>
              </div>
            </section>

            {result.warnings.length > 0 ? (
              <section className="panel">
                <h2 className="section-title">تحذيرات</h2>
                <ul className="list bullets">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="panel">
              <div className="split-row">
                <div>
                  <h2 className="section-title">بطاقات العملاء</h2>
                  <p className="muted">
                    العملاء بدرجة ملاءمة 80 أو أكثر فقط مؤهلون. العملاء ذوو خطر التكرار المرتفع
                    يظهرون بوضوح ولا يتم حفظهم.
                  </p>
                </div>
                <span className="badge">{result.leads.length} مقترح</span>
              </div>

              {result.leads.length === 0 ? (
                <p className="muted">لم يتم حفظ أي عميل مؤهل في هذا التشغيل.</p>
              ) : (
                <div className="stack">
                  {result.leads.map((lead) => (
                    <div className="panel subtle" key={`${lead.companyName}-${lead.website}`}>
                      <div className="split-row">
                        <strong>{lead.companyName}</strong>
                        <div className="button-row">
                          <span className="badge">{lead.fitScore}% ملاءمة</span>
                          <span className={lead.duplicateRisk === "high" ? "badge warning" : "badge"}>
                            خطر التكرار: {duplicateRiskAr(lead.duplicateRisk)}
                          </span>
                        </div>
                      </div>
                      <div className="meta-grid">
                        <a href={lead.website} rel="noreferrer" target="_blank">
                          {lead.website}
                        </a>
                        <span>{lead.officialEmail}</span>
                        <a href={lead.emailSource} rel="noreferrer" target="_blank">
                          مصدر البريد
                        </a>
                        <span>{lead.companySizeEstimate}</span>
                        <span>احتمال القبول: {lead.acceptanceLikelihood}%</span>
                        <span>{statusAr(lead.contactStatus)}</span>
                      </div>
                      <div className="grid two">
                        <div>
                          <strong>سبب الاختيار</strong>
                          <p className="muted">{lead.reasonForSelection}</p>
                        </div>
                        <div>
                          <strong>لماذا قد يدفعون</strong>
                          <p className="muted">{lead.whyTheyMightPay}</p>
                        </div>
                      </div>
                      <div>
                        <strong>نقاط الألم الظاهرة</strong>
                        <ul className="list bullets">
                          {lead.visiblePainPoints.map((painPoint) => (
                            <li key={painPoint}>{painPoint}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>موضوع البريد المقترح</strong>
                        <p>{lead.proposedEmailSubject}</p>
                      </div>
                      <div>
                        <strong>نص البريد المقترح</strong>
                        <pre className="code-block">{lead.proposedEmailBody}</pre>
                      </div>
                      {lead.warnings.length > 0 ? (
                        <div>
                          <strong>تحذيرات</strong>
                          <ul className="list bullets">
                            {lead.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="button-row">
                        {lead.leadId ? (
                          <Link className="button secondary" href={`/leads/${lead.leadId}`}>
                            <Icons.target size={18} />
                            حفظ في العملاء
                          </Link>
                        ) : (
                          <span className="badge warning">تم تخطيه بسبب حماية التكرار</span>
                        )}
                        {lead.approvalId ? (
                          <Link className="button secondary" href={`/approval-center/${lead.approvalId}`}>
                            <Icons.approval size={18} />
                            إرسال إلى مركز الموافقات
                          </Link>
                        ) : null}
                        {lead.leadId ? (
                          <form action={rejectLiveResearchLeadAction}>
                            <input name="leadId" type="hidden" value={lead.leadId} />
                            <input name="productSlug" type="hidden" value={product.slug} />
                            <button className="button warning" type="submit">
                              رفض / غير مناسب
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
