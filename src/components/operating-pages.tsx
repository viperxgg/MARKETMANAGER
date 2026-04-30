import Link from "next/link";
import {
  createCampaignBriefAction,
  createExperimentAction,
  createMemoryInsightAction,
  createOutreachDraftAction,
  createReportAction,
  createSocialDraftAction,
  createWebsiteAnalysisAction,
  generateFacebookImageAction,
  generateFacebookPostAction,
  importResearchedLeadAction,
  recordManualMetricAction
} from "@/app/actions";
import { getOperatingData } from "@/lib/data-service";
import { parseContentStudioNotes } from "@/lib/content-studio";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";
import { isOpenAiImageConfigured, isOpenAiTextConfigured } from "@/lib/openai-config";
import { products } from "@/lib/product-data";
import { getLeadScoringRules } from "@/lib/scoring";
import { channelAr, duplicateRiskAr, scopeAr, statusAr } from "@/lib/ui-ar";
import { Icons } from "./icons";
import { DismissCardButton, ShowDismissedToggle } from "./dismiss-card";
import { SectionPage } from "./section-page";

type OperatingData = Awaited<ReturnType<typeof getOperatingData>>;
type AnyRecord = Record<string, any>;

const confidenceOptions = ["unknown", "low", "medium", "high"];
const channelOptions = ["facebook", "instagram", "linkedin", "email", "manual", "codex_research"];
const reportTypeOptions = [
  "weekly_campaign_report",
  "lead_quality_report",
  "outreach_performance_report",
  "social_content_report",
  "product_positioning_report",
  "monthly_learning_report"
];
const memoryCategoryOptions = [
  "winning_messages",
  "weak_messages",
  "best_segments",
  "poor_fit_segments",
  "objections",
  "successful_ctas",
  "bad_ctas",
  "visual_styles",
  "market_insights",
  "compliance_lessons",
  "pricing_feedback",
  "customer_language"
];
const postTypeOptions = [
  "educational",
  "trust-building",
  "product demo",
  "problem/solution",
  "case-study style",
  "behind the scenes",
  "offer",
  "FAQ",
  "objection handling"
];

const confidenceLabels: Record<string, string> = {
  unknown: "غير معروف",
  low: "منخفضة",
  medium: "متوسطة",
  high: "مرتفعة"
};

const reportTypeLabels: Record<string, string> = {
  weekly_campaign_report: "تقرير حملة أسبوعي",
  lead_quality_report: "تقرير جودة العملاء",
  outreach_performance_report: "تقرير أداء التواصل",
  social_content_report: "تقرير المحتوى الاجتماعي",
  product_positioning_report: "تقرير تموضع المنتج",
  monthly_learning_report: "تقرير تعلم شهري"
};

const memoryCategoryLabels: Record<string, string> = {
  winning_messages: "رسائل ناجحة",
  weak_messages: "رسائل ضعيفة",
  best_segments: "أفضل الشرائح",
  poor_fit_segments: "شرائح غير مناسبة",
  objections: "اعتراضات",
  successful_ctas: "دعوات إجراء ناجحة",
  bad_ctas: "دعوات إجراء ضعيفة",
  visual_styles: "أنماط بصرية",
  market_insights: "رؤى السوق",
  compliance_lessons: "دروس الالتزام",
  pricing_feedback: "ملاحظات التسعير",
  customer_language: "لغة العملاء"
};

const postTypeLabels: Record<string, string> = {
  educational: "تعليمي",
  "trust-building": "بناء الثقة",
  "product demo": "عرض المنتج",
  "problem/solution": "مشكلة وحل",
  "case-study style": "أسلوب دراسة حالة",
  "behind the scenes": "خلف الكواليس",
  offer: "عرض",
  FAQ: "أسئلة شائعة",
  "objection handling": "معالجة الاعتراضات"
};

const metricLabels: Record<string, string> = {
  impressions: "الظهور",
  clicks: "النقرات",
  replies: "الردود",
  meetingsBooked: "الاجتماعات",
  conversions: "التحويلات",
  bookings: "الحجوزات",
  whatWasDone: "ما الذي تم",
  whatWorked: "ما الذي نجح",
  whatDidNotWork: "ما الذي لم ينجح",
  recommendations: "التوصيات",
  nextWeekPlan: "خطة الأسبوع القادم"
};

function ProductSelect({ name = "productSlug" }: { name?: string }) {
  return (
    <select name={name} required defaultValue="">
      <option value="" disabled>
        اختر المنتج
      </option>
      {products.map((product) => (
        <option key={product.slug} value={product.slug}>
          {product.name}
        </option>
      ))}
    </select>
  );
}

function OptionalProductSelect() {
  return (
    <select name="productSlug">
      <option value="">عام</option>
      {products.map((product) => (
        <option key={product.slug} value={product.slug}>
          {product.name}
        </option>
      ))}
    </select>
  );
}

function ProductScopeFilter({ data, basePath }: { data: OperatingData; basePath: string }) {
  const options = [
    { href: basePath, label: "كل المنتجات", active: data.productFilter === "all" },
    ...data.products.map((product) => ({
      href: `${basePath}?product=${product.slug}`,
      label: product.name,
      active: data.productFilter === product.slug
    })),
    { href: `${basePath}?product=global`, label: "عام", active: data.productFilter === "global" }
  ];

  return (
    <section className="panel subtle">
      <div className="split-row">
        <div>
          <strong>النطاق</strong>
          <p className="muted">العرض الحالي: {scopeAr(data.productFilterLabel)}</p>
        </div>
        <div className="button-row">
          {options.map((option) => (
            <Link className={`button compact ${option.active ? "" : "secondary"}`} href={option.href} key={option.label}>
              {option.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CampaignSelect({ campaigns, optional = true }: { campaigns: AnyRecord[]; optional?: boolean }) {
  return (
    <select name="campaignId" required={!optional}>
      {optional ? <option value="">بدون حملة</option> : null}
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.name}
        </option>
      ))}
    </select>
  );
}

function LeadSelect({ leads }: { leads: AnyRecord[] }) {
  return (
    <select name="leadId" required>
      {leads.map((lead) => (
        <option key={lead.id} value={lead.id}>
          {lead.companyName} - {lead.fitScore}
        </option>
      ))}
    </select>
  );
}

function EmptyAction({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="panel subtle">
      <p className="muted">{text}</p>
      <Link className="button secondary" href={href}>
        <Icons.file size={18} />
        {label}
      </Link>
    </div>
  );
}

function compactText(value: string, max = 320) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max).trim()}...`;
}

function facebookImageStatus(asset: AnyRecord | undefined, imageGenerationConfigured: boolean) {
  if (asset?.imageUrl || asset?.storedImageReference) {
    return { label: "Image draft ready", className: "badge" };
  }

  if (!imageGenerationConfigured) {
    return { label: "Image generation unavailable", className: "badge warning" };
  }

  return { label: "No image", className: "badge warning" };
}

function DraftMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <strong>{label}</strong>
      {value}
    </span>
  );
}

function LeadImportForm({ data, returnTo = "/lead-research" }: { data: OperatingData; returnTo?: string }) {
  const campaigns = data.campaigns as AnyRecord[];

  return (
    <form action={importResearchedLeadAction} className="stack">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="form-grid">
        <div className="field">
          <label>المنتج</label>
          <ProductSelect />
        </div>
        <div className="field">
          <label>الحملة</label>
          <CampaignSelect campaigns={campaigns} />
        </div>
        <div className="field">
          <label>الشركة</label>
          <input name="companyName" placeholder="اسم شركة مؤهلة" required />
        </div>
        <div className="field">
          <label>الموقع</label>
          <input name="website" placeholder="https://example.se" required type="url" />
        </div>
        <div className="field">
          <label>المدينة</label>
          <input name="city" placeholder="Stockholm" required />
        </div>
        <div className="field">
          <label>القطاع</label>
          <input name="industry" placeholder="القطاع" required />
        </div>
        <div className="field">
          <label>الشريحة</label>
          <input name="segment" placeholder="شريحة خاصة بالمنتج" required />
        </div>
        <div className="field">
          <label>رابط المصدر</label>
          <input name="sourceUrl" placeholder="https://official-site.se" required type="url" />
        </div>
        <div className="field">
          <label>درجة الملاءمة</label>
          <input defaultValue="85" max="100" min="0" name="fitScore" required type="number" />
        </div>
        <div className="field">
          <label>الثقة</label>
          <select name="confidenceLevel">
            {confidenceOptions.map((option) => (
              <option key={option} value={option}>
                {confidenceLabels[option] ?? option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>البريد الرسمي</label>
          <input name="officialEmail" placeholder="info@example.se" type="email" />
        </div>
        <div className="field">
          <label>رابط مصدر البريد</label>
          <input name="emailSourceUrl" placeholder="https://example.se/kontakt" type="url" />
        </div>
        <div className="field">
          <label>صفحة مصدر البريد</label>
          <input name="emailSourcePage" placeholder="Kontakt / Om oss / footer" />
        </div>
        <div className="field">
          <label>ثقة البريد</label>
          <select name="emailConfidence">
            {confidenceOptions.map((option) => (
              <option key={option} value={option}>
                {confidenceLabels[option] ?? option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>سبب الملاءمة</label>
        <textarea name="reasonForFit" placeholder="لماذا هذه الشركة مناسبة وليست اختيارًا عشوائيًا." required />
      </div>
      <div className="field">
        <label>أفضل زاوية دخول</label>
        <textarea name="bestEntryAngle" placeholder="زاوية تواصل مبنية على فرصة." required />
      </div>
      <div className="field">
        <label>وسوم</label>
        <input name="tags" placeholder="المدينة، الشريحة، المصدر" />
      </div>
      <button className="button" type="submit">
        <Icons.target size={18} />
        استيراد عميل تم بحثه
      </button>
    </form>
  );
}

function LeadsList({ leads }: { leads: AnyRecord[] }) {
  if (leads.length === 0) {
    return (
      <EmptyAction
        href="/lead-research"
        label="استيراد أول عميل"
        text="لا يوجد عملاء محفوظون بعد. أنشئ مهمة بحث واستورد العملاء المتحقق منهم."
      />
    );
  }

  return (
    <div className="stack">
      {leads.map((lead) => (
        <div className="panel subtle" key={lead.id}>
          <div className="split-row">
            <strong>{lead.companyName}</strong>
            <span className="badge warning">{statusAr(lead.status)}</span>
          </div>
          <div className="meta-grid">
            <span>{lead.product?.name ?? "منتج"}</span>
            <span>{lead.city}</span>
            <span>درجة الملاءمة: {lead.fitScore}</span>
            <span>البريد: {lead.officialEmail ? "حقل متحقق موجود" : "غير موجود"}</span>
          </div>
          <p className="muted">{lead.reasonForFit}</p>
          <Link className="button secondary" href={`/leads/${lead.id}`}>
            <Icons.target size={18} />
            فتح العميل
          </Link>
        </div>
      ))}
    </div>
  );
}

export function CampaignsOperatingPage({ data }: { data: OperatingData }) {
  const campaigns = data.campaigns as AnyRecord[];

  return (
    <SectionPage
      eyebrow="الاستراتيجية"
      title="الحملات"
      description="أنشئ موجزات حملات منظمة وافتح كل حملة كسجل عمل."
    >
      <ProductScopeFilter data={data} basePath="/campaigns" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء موجز حملة</h2>
          <CampaignBriefForm />
        </div>
        <div className="panel">
          <h2 className="section-title">أحدث الحملات</h2>
          {campaigns.length === 0 ? (
            <p className="muted">لا توجد حملات بعد. أنشئ موجز حملة لبدء سير عمل مضبوط.</p>
          ) : (
            <div className="stack">
              {campaigns.map((campaign) => (
                <div className="panel subtle" key={campaign.id}>
                  <div className="split-row">
                    <strong>{campaign.name}</strong>
                    <span className="badge warning">{statusAr(campaign.status)}</span>
                  </div>
                  <p className="muted">{campaign.product?.name} - {channelAr(campaign.channel)}</p>
                  <Link className="button secondary" href={`/campaigns/${campaign.id}`}>
                    <Icons.file size={18} />
                    فتح الحملة
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}

function CampaignBriefForm() {
  return (
    <form action={createCampaignBriefAction} className="stack">
      <div className="form-grid">
        <div className="field">
          <label>المنتج</label>
          <ProductSelect />
        </div>
        <div className="field">
          <label>الشريحة المستهدفة</label>
          <input name="targetSegment" placeholder="شريحة المنتج المختارة في السويد" required />
        </div>
        <div className="field">
          <label>الهدف</label>
          <input name="objective" placeholder="اختبار الاهتمام بمكالمة عرض" required />
        </div>
        <div className="field">
          <label>القناة الأساسية</label>
          <select name="channel" required>
            {channelOptions.map((channel) => (
              <option key={channel} value={channel}>
                {channelAr(channel)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>زاوية الرسالة</label>
        <input name="messageAngle" placeholder="رحلة عميل أبسط بدون ضغط" required />
      </div>
      <button className="button" type="submit">
        <Icons.file size={18} />
        إنشاء الموجز
      </button>
    </form>
  );
}

export function LeadsOperatingPage({ data }: { data: OperatingData }) {
  const leads = data.leads as AnyRecord[];

  return (
    <SectionPage
      eyebrow="خط العملاء"
      title="العملاء المحتملون"
      description="راجع جودة العملاء والتحقق من البريد الرسمي والحالة والإجراءات اليدوية التالية."
    >
      <ProductScopeFilter data={data} basePath="/leads" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">استيراد عميل يدويًا</h2>
          <LeadImportForm data={data} returnTo="/leads" />
        </div>
        <div className="panel">
          <h2 className="section-title">قواعد جودة العملاء</h2>
          <ul className="list bullets">
            {getLeadScoringRules().map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">العملاء المحفوظون</h2>
        <LeadsList leads={leads} />
      </section>
    </SectionPage>
  );
}

export function LeadResearchOperatingPage({ data }: { data: OperatingData }) {
  const leads = data.leads as AnyRecord[];
  const visibleLeads = leads.filter((lead) => !(lead.tags ?? []).includes("internal-test"));
  const qualifiedVisibleLeads = visibleLeads.filter(
    (lead) => lead.fitScore >= 85 && Boolean(lead.officialEmail && lead.emailSourceUrl)
  );
  const selectedProduct =
    data.productFilter !== "all" && data.productFilter !== "global"
      ? products.find((product) => product.slug === data.productFilter)
      : null;
  const providerStatus = getLeadSearchProviderStatus();

  return (
    <SectionPage
      eyebrow="البحث"
      title="بحث العملاء"
      description="افصل بين الاستيراد اليدوي والبحث الحي. لا يتم إنشاء عملاء وهميين ولا يتم إرسال أي بريد."
    >
      <ProductScopeFilter data={data} basePath="/lead-research" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">A. استيراد عميل يدوي</h2>
          <p className="muted">
            أدخل شركة مع مصدر رسمي. يحفظ النظام العميل كمسودة أو مراجعة، ولا يرسل أي بريد.
          </p>
          <LeadImportForm data={data} />
        </div>

        <div className="panel">
          <h2 className="section-title">B. بحث حي عن العملاء</h2>
          <div className="stack">
            <div className="split-row">
              <span>مزوّد البحث</span>
              <span className={providerStatus.providerConfigured ? "badge" : "badge warning"}>
                {providerStatus.providerConfigured ? "مضبوط" : "غير موجود"}
              </span>
            </div>
            <div className="split-row">
              <span>OpenAI</span>
              <span className={providerStatus.openAiConfigured ? "badge" : "badge warning"}>
                {providerStatus.openAiConfigured ? "مضبوط" : "غير موجود"}
              </span>
            </div>
            <p className="muted">{providerStatus.message}</p>
            {selectedProduct ? (
              <Link className="button" href={`/products/${selectedProduct.slug}/lead-research/live`}>
                <Icons.search size={18} />
                فتح البحث الحي لـ {selectedProduct.name}
              </Link>
            ) : (
              <p className="notice warning">اختر منتجًا محددًا لتشغيل البحث الحي. لا يتم تشغيل البحث على كل المنتجات معًا.</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="split-row">
          <div>
            <h2 className="section-title">بطاقات العملاء</h2>
            <p className="muted">
              تعرض البطاقات العملاء المحفوظين أو المستوردين فقط. لا توجد شركات مولدة من خيال الذكاء الاصطناعي.
            </p>
          </div>
          <div className="button-row">
            <span className="badge">{qualifiedVisibleLeads.length} مؤهل</span>
            <span className="badge warning">التنفيذ اليدوي فقط</span>
          </div>
        </div>
        {visibleLeads.length === 0 ? (
          <EmptyAction
            href="/products"
            label="اختيار منتج"
            text="لا يوجد عملاء محفوظون بعد. ابدأ من مساحة عمل المنتج أو استورد عميلًا يدويًا."
          />
        ) : (
          <div className="stack">
            {visibleLeads.map((lead) => {
              const emailSource = lead.emailSourceUrl ?? lead.contactVerification?.emailSourceUrl;
              const email = lead.officialEmail ?? lead.contactVerification?.officialEmail;

              return (
                <div className="panel subtle" key={lead.id}>
                  <div className="split-row">
                    <strong>{lead.companyName}</strong>
                    <div className="button-row">
                      <span className="badge">{lead.fitScore}%</span>
                      <span className="badge warning">{statusAr(lead.status)}</span>
                    </div>
                  </div>
                  <div className="meta-grid">
                    <a href={lead.website} rel="noreferrer" target="_blank">{lead.website}</a>
                    <span>{email ?? "لا يوجد بريد رسمي"}</span>
                    {emailSource ? (
                      <a href={emailSource} rel="noreferrer" target="_blank">مصدر البريد</a>
                    ) : (
                      <span>لا يوجد مصدر بريد</span>
                    )}
                    <span>المنتج: {lead.product?.name ?? "غير محدد"}</span>
                    <span>خطر التكرار: غير محدد</span>
                    <span>الموافقة: {lead.approved_by_owner ? "معتمد" : "بانتظار مراجعة المالك"}</span>
                  </div>
                  <div className="grid two">
                    <div>
                      <strong>سبب الاختيار</strong>
                      <p className="muted">{lead.reasonForFit}</p>
                    </div>
                    <div>
                      <strong>لماذا قد يدفعون</strong>
                      <p className="muted">{lead.bestEntryAngle || "غير مسجل بعد."}</p>
                    </div>
                  </div>
                  <div>
                    <strong>البريد السويدي المقترح</strong>
                    <p className="muted">
                      {lead.outreachDrafts?.[0]?.bodyPreview || "لا توجد مسودة بريد محفوظة لهذا العميل بعد."}
                    </p>
                  </div>
                  <Link className="button secondary" href={`/leads/${lead.id}`}>
                    <Icons.target size={18} />
                    فتح العميل
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </SectionPage>
  );
}

export function WebsiteAnalysisOperatingPage({ data }: { data: OperatingData }) {
  const leads = data.leads as AnyRecord[];
  const analyses = data.websiteAnalyses as AnyRecord[];

  return (
    <SectionPage
      eyebrow="تحليل داخلي"
      title="تحليل المواقع"
      description="احفظ صياغة الفرصة داخليًا. لا تحوّل النقد المباشر إلى تواصل."
    >
      <ProductScopeFilter data={data} basePath="/website-analysis" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء تحليل موقع</h2>
          {leads.length === 0 ? (
            <EmptyAction href="/lead-research" label="استيراد عميل أولًا" text="تحليل الموقع يحتاج عميلًا محفوظًا." />
          ) : (
            <form action={createWebsiteAnalysisAction} className="stack">
              <div className="field">
                <label>العميل</label>
                <LeadSelect leads={leads} />
              </div>
              <div className="form-grid">
                {[
                  ["menuServiceClarity", "وضوح العرض أو الخدمة"],
                  ["customerJourney", "رحلة العميل"],
                  ["mobileExperience", "تجربة الهاتف"],
                  ["bookingContactClarity", "وضوح الحجز أو التواصل"],
                  ["visualClarity", "الوضوح البصري"],
                  ["trustSignals", "إشارات الثقة"]
                ].map(([field, label]) => (
                  <div className="field" key={field}>
                    <label>{label}</label>
                    <input defaultValue="6" max="10" min="0" name={field} required type="number" />
                  </div>
                ))}
              </div>
              <div className="field">
                <label>احتكاك التحويل</label>
                <textarea name="conversionFriction" required />
              </div>
              <div className="field">
                <label>صياغة الفرصة</label>
                <textarea name="opportunityFraming" required />
              </div>
              <div className="field">
                <label>لماذا يناسب منتجنا</label>
                <textarea name="productFitReason" required />
              </div>
              <div className="field">
                <label>الثقة</label>
                <select name="confidenceLevel">
                  {confidenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {confidenceLabels[option] ?? option}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button" type="submit">
                <Icons.clipboard size={18} />
                حفظ التحليل
              </button>
            </form>
          )}
        </div>
        <div className="panel">
          <h2 className="section-title">التحليلات المحفوظة</h2>
          {analyses.length === 0 ? (
            <p className="muted">لا توجد تحليلات بعد.</p>
          ) : (
            <div className="stack">
              {analyses.map((analysis) => (
                <div className="panel subtle" key={analysis.id}>
                  <strong>{analysis.lead.companyName}</strong>
                  <p className="muted">{analysis.opportunityFraming}</p>
                  <Link className="button secondary" href={`/website-analysis/${analysis.id}`}>
                    <Icons.clipboard size={18} />
                    فتح التحليل
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}

export function OutreachOperatingPage({ data }: { data: OperatingData }) {
  const qualifiedLeads = (data.leads as AnyRecord[]).filter(
    (lead) => lead.fitScore >= 85 && lead.officialEmail && lead.emailSourceUrl
  );
  const drafts = data.outreachDrafts as AnyRecord[];

  return (
    <SectionPage
      eyebrow="صياغة البريد"
      title="استوديو التواصل"
      description="أنشئ مسودات تواصل سويدية للعملاء المؤهلين فقط. لا يوجد إرسال مباشر."
    >
      <ProductScopeFilter data={data} basePath="/outreach-studio" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء مسودة تواصل</h2>
          {qualifiedLeads.length === 0 ? (
            <EmptyAction
              href="/lead-research"
              label="استيراد عميل مؤهل"
              text="لا يوجد عملاء مؤهلون مع مصادر بريد رسمية متاحة."
            />
          ) : (
            <form action={createOutreachDraftAction} className="stack">
              <div className="field">
                <label>عميل مؤهل</label>
                <LeadSelect leads={qualifiedLeads} />
              </div>
              {[
                ["subject", "الموضوع"],
                ["opening", "الافتتاحية"],
                ["observation", "الملاحظة"],
                ["opportunity", "الفرصة"],
                ["productConnection", "ارتباط المنتج"],
                ["softCta", "دعوة إجراء لطيفة"],
                ["closing", "الخاتمة"],
                ["optOutText", "خيار إلغاء مهذب"]
              ].map(([name, label]) => (
                <div className="field" key={name}>
                  <label>{label}</label>
                  <textarea name={name} required={name !== "optOutText"} />
                </div>
              ))}
              <button className="button" type="submit">
                <Icons.mail size={18} />
                إنشاء مسودة بريد
              </button>
            </form>
          )}
        </div>
        <div className="panel">
          <h2 className="section-title">مسودات البريد</h2>
          {drafts.length === 0 ? (
            <p className="muted">لا توجد مسودات تواصل بعد.</p>
          ) : (
            <div className="stack">
              {drafts.map((draft) => (
                <div className="panel subtle" key={draft.id}>
                  <div className="split-row">
                    <strong>{draft.subject}</strong>
                    <span className="badge warning">{statusAr(draft.status)}</span>
                  </div>
                  <p className="muted">{draft.company}</p>
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
    </SectionPage>
  );
}

export function SocialOperatingPage({ data }: { data: OperatingData }) {
  const campaigns = data.campaigns as AnyRecord[];
  const posts = data.socialPostDrafts as AnyRecord[];
  const openAiTextConfigured = isOpenAiTextConfigured();
  const imageGenerationConfigured = isOpenAiImageConfigured();
  const filterQuery =
    data.productFilter !== "all" ? `?product=${data.productFilter}` : "";
  const basePath = `/social-studio${filterQuery}`;
  const returnTo = `${basePath}${data.showDismissed ? `${basePath.includes("?") ? "&" : "?"}showDismissed=1` : ""}`;
  const selectedProduct =
    data.productFilter !== "all" && data.productFilter !== "global"
      ? products.find((product) => product.slug === data.productFilter)
      : null;

  return (
    <SectionPage
      eyebrow="إنتاج المحتوى"
      title="استوديو المحتوى"
      description="ابدأ باختيار منتج. التوليد الذكي متاح فقط داخل سياق منتج محدد، وكل الناتج يبقى مسودة للمراجعة."
    >
      <ProductScopeFilter data={data} basePath="/social-studio" />
      <section className="panel subtle">
        <div className="split-row">
          <div>
            <strong>مكان ثانوي للعمل</strong>
            <p className="muted">الأفضل أن تبدأ من صفحة المنتجات، ثم مساحة عمل المنتج. هذا الاستوديو لعرض وتنظيف المسودات.</p>
          </div>
          <ShowDismissedToggle basePath={basePath} showDismissed={data.showDismissed} />
        </div>
      </section>
      {!selectedProduct ? (
        <section className="notice warning">
          اختر منتجًا أولًا لإنشاء محتوى جديد. عند عرض كل المنتجات، يعرض الاستوديو المسودات الموجودة فقط ولا يشغّل توليدًا.
        </section>
      ) : (
        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">مسودة منتج بالذكاء الاصطناعي</h2>
            <p className="muted">
              يستخدم سياق {selectedProduct.name} فقط لإنشاء منشور فيسبوك سويدي كمسودة وإرساله للموافقة.
              توليد الصورة خطوة منفصلة بعد حفظ المسودة.
            </p>
            {!openAiTextConfigured ? (
              <div className="notice warning">
                OpenAI غير مضبوط على الخادم. أضف OPENAI_API_KEY و OPENAI_MODEL. لن يتم توليد أو حفظ مسودة AI وهمية.
              </div>
            ) : null}
            <form action={generateFacebookPostAction} className="stack">
              <input name="productSlug" type="hidden" value={selectedProduct.slug} />
              <button className="button" disabled={!openAiTextConfigured} type="submit">
                <Icons.megaphone size={18} />
                إنشاء منشور فيسبوك بالذكاء الاصطناعي
              </button>
            </form>
            <ul className="list bullets">
              <li>لا يوجد نشر تلقائي.</li>
              <li>موافقة المالك مطلوبة.</li>
              <li>خطر التكرار يظهر داخل المسودة عند توفره.</li>
            </ul>
          </div>

          <div className="panel">
            <h2 className="section-title">مسودة يدوية</h2>
            <form action={createSocialDraftAction} className="stack">
              <input name="productSlug" type="hidden" value={selectedProduct.slug} />
              <div className="form-grid">
                <div className="field">
                  <label>الحملة</label>
                  <CampaignSelect campaigns={campaigns} />
                </div>
                <div className="field">
                  <label>المنصة</label>
                  <select name="platform" required>
                    <option value="facebook">{channelAr("facebook")}</option>
                    <option value="instagram">{channelAr("instagram")}</option>
                    <option value="linkedin">{channelAr("linkedin")}</option>
                  </select>
                </div>
                <div className="field">
                  <label>نوع المنشور</label>
                  <select name="postType" required>
                    {postTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {postTypeLabels[type] ?? type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>زاوية المحتوى</label>
                <input name="campaignAngle" required />
              </div>
              <div className="field">
                <label>الجمهور</label>
                <input name="audience" defaultValue={selectedProduct.targetAudience} required />
              </div>
              <div className="field">
                <label>الافتتاحية الجاذبة</label>
                <input name="hook" required />
              </div>
              <div className="field">
                <label>النص</label>
                <textarea name="body" required />
              </div>
              <div className="field">
                <label>دعوة الإجراء</label>
                <input name="cta" required />
              </div>
              <div className="field">
                <label>الوسوم</label>
                <input name="hashtags" placeholder="وسم-أول، وسم-ثان" />
              </div>
              <div className="field">
                <label>فكرة الصورة</label>
                <input name="imageConcept" required />
              </div>
              <div className="field">
                <label>وصف الصورة بالإنجليزية</label>
                <textarea name="imagePromptEn" required />
              </div>
              <div className="field">
                <label>ما يجب تجنبه بصريًا</label>
                <input name="visualAvoid" placeholder="شعارات وهمية، ادعاءات مبالغ فيها" />
              </div>
              <button className="button secondary" type="submit">
                <Icons.megaphone size={18} />
                حفظ مسودة يدوية
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="section-title">المسودات الموجودة</h2>
        {posts.length === 0 ? (
          <p className="muted">لا توجد مسودات اجتماعية بعد.</p>
        ) : (
          <div className="stack">
            {posts.map((post) => {
              const output = parseContentStudioNotes(post.notes ?? "");
              const asset = post.assets?.[0];
              const imageStatus = facebookImageStatus(asset, imageGenerationConfigured);

              return (
                  <div className={`panel subtle draft-card ${post._dismissed ? "dismissed-card" : ""}`} key={post.id}>
                    <div className="draft-card-header">
                      <div>
                        <strong>{post.campaignAngle || post.hook}</strong>
                        <p className="muted">{post.product?.name ?? "غير محدد"}</p>
                      </div>
                      <DismissCardButton
                        itemId={post.id}
                        itemType="social_post_draft"
                        productSlug={post.product?.slug}
                        returnTo={returnTo}
                        isDismissed={post._dismissed}
                      />
                    </div>
                    <div className="draft-card-meta">
                      <DraftMetaItem label="المنصة: " value={channelAr(post.platform)} />
                      <DraftMetaItem label="اللغة: " value={output?.language ?? "غير محددة"} />
                      <DraftMetaItem label="خطر التكرار: " value={duplicateRiskAr(output?.duplicateRisk) || "غير محدد"} />
                      <DraftMetaItem label="الموافقة: " value={post.approved_by_owner ? "معتمد" : "بانتظار مراجعة المالك"} />
                      <span className="badge warning">{statusAr(post.status)}</span>
                      <span className={imageStatus.className}>{imageStatus.label}</span>
                    </div>
                    <p className="draft-card-body">{compactText(post.body)}</p>
                    {asset?.imageUrl || asset?.storedImageReference ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Facebook draft asset"
                        className="draft-image-preview"
                        src={asset.imageUrl ?? asset.storedImageReference}
                      />
                    ) : null}
                    <div className="draft-card-actions">
                      <Link className="button secondary compact" href={`/social-studio/${post.id}`}>
                        <Icons.megaphone size={18} />
                        معاينة المسودة
                      </Link>
                      {post.product?.slug ? (
                        <Link className="button secondary compact" href={`/products/${post.product.slug}`}>
                          <Icons.file size={18} />
                          فتح مساحة المنتج
                        </Link>
                      ) : null}
                      {post.platform === "facebook" ? (
                        <form action={generateFacebookImageAction}>
                          <input name="socialPostDraftId" type="hidden" value={post.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <button className="button secondary compact" type="submit">
                            <Icons.image size={18} />
                            توليد صورة فيسبوك
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
              );
            })}
          </div>
        )}
      </section>
    </SectionPage>
  );
}

export function ApprovalOperatingPage({ data }: { data: OperatingData }) {
  const approvals = data.approvalItems as AnyRecord[];
  const filterQuery =
    data.productFilter !== "all" ? `?product=${data.productFilter}` : "";
  const basePath = `/approval-center${filterQuery}`;
  const returnTo = `${basePath}${data.showDismissed ? `${basePath.includes("?") ? "&" : "?"}showDismissed=1` : ""}`;
  const groupedApprovals = approvals.reduce<Record<string, AnyRecord[]>>((groups, item) => {
    const key = `${item.product?.name ?? "عام"} / ${item.itemType} / ${statusAr(item.status)}`;
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});

  return (
    <SectionPage
      eyebrow="بوابة السلامة"
      title="مركز الموافقات"
      description="راجع البريد والمنشورات والحملات والعملاء ووصف الصور والتقارير قبل التنفيذ اليدوي."
    >
      <ProductScopeFilter data={data} basePath="/approval-center" />
      <section className="panel subtle">
        <div className="split-row">
          <div>
            <strong>فلترة البطاقات</strong>
            <p className="muted">الإخفاء بصري فقط ولا يحذف سجل الموافقة أو التاريخ.</p>
          </div>
          <ShowDismissedToggle basePath={basePath} showDismissed={data.showDismissed} />
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">بوابة المراجعة النهائية</h2>
        {approvals.length === 0 ? (
          <p className="muted">لا توجد عناصر موافقة بعد.</p>
        ) : (
          <div className="stack">
            {Object.entries(groupedApprovals).map(([group, items]) => (
              <div className="panel subtle" key={group}>
                <div className="split-row">
                  <strong>{group}</strong>
                  <span className="badge">{items.length}</span>
                </div>
                <div className="stack">
                  {items.map((item) => (
                    <div className={`panel ${item._dismissed ? "dismissed-card" : ""}`} key={item.id}>
                  <div className="split-row">
                    <strong>{item.itemType}</strong>
                    <div className="button-row">
                      <span className="badge warning">{statusAr(item.status)}</span>
                      <DismissCardButton
                        itemId={item.id}
                        itemType="approval_item"
                        productSlug={item.product?.slug}
                        returnTo={returnTo}
                        isDismissed={item._dismissed}
                      />
                    </div>
                  </div>
                  <p className="muted">المنتج: {item.product?.name ?? "عام"}</p>
                  <p>{item.contentPreview}</p>
                      <ul className="list bullets">
                        {(item.riskWarnings ?? []).slice(0, 3).map((warning: string) => (
                          <li key={warning}>{warning}</li>
                        ))}
                        <li>لا يوجد إرسال أو نشر تلقائي.</li>
                        <li>موافقة المالك مطلوبة قبل التنفيذ اليدوي.</li>
                      </ul>
                <Link className="button secondary" href={`/approval-center/${item.id}`}>
                  <Icons.approval size={18} />
                  مراجعة العنصر
                </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SectionPage>
  );
}

export function ManualTrackingOperatingPage({ data }: { data: OperatingData }) {
  const entries = data.manualTrackingEntries as AnyRecord[];
  const campaigns = data.campaigns as AnyRecord[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SectionPage
      eyebrow="التتبع"
      title="التتبع اليدوي"
      description="تتبع النشاط المنفذ يدويًا كبيانات CRM خفيفة."
    >
      <ProductScopeFilter data={data} basePath="/manual-tracking" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">تسجيل نشاط يدوي</h2>
          <form action={recordManualMetricAction} className="stack">
            <input name="returnTo" type="hidden" value="/manual-tracking" />
            <div className="form-grid">
              <div className="field">
                <label>المنتج</label>
                <OptionalProductSelect />
              </div>
              <div className="field">
                <label>الحملة</label>
                <CampaignSelect campaigns={campaigns} />
              </div>
              <div className="field">
                <label>القناة</label>
                <select name="channel" required>
                  <option value="email">{channelAr("email")}</option>
                  <option value="facebook">{channelAr("facebook")}</option>
                  <option value="instagram">{channelAr("instagram")}</option>
                  <option value="linkedin">{channelAr("linkedin")}</option>
                  <option value="manual">{channelAr("manual")}</option>
                </select>
              </div>
              <div className="field">
                <label>التاريخ</label>
                <input defaultValue={today} name="metricDate" required type="date" />
              </div>
              <div className="field">
                <label>الشركة</label>
                <input name="company" />
              </div>
              <div className="field">
                <label>الموضوع</label>
                <input name="subject" />
              </div>
              {["impressions", "clicks", "replies", "meetingsBooked", "conversions", "bookings"].map((name) => (
                <div className="field" key={name}>
                  <label>{metricLabels[name] ?? name}</label>
                  <input defaultValue="0" min="0" name={name} type="number" />
                </div>
              ))}
            </div>
            <div className="field">
              <label>ملاحظات</label>
              <textarea name="notes" />
            </div>
            <button className="button" type="submit">
              <Icons.check size={18} />
              تسجيل المؤشر
            </button>
          </form>
        </div>
        <div className="panel">
          <h2 className="section-title">أحدث التتبع</h2>
          {entries.length === 0 ? (
            <p className="muted">لا توجد إدخالات تتبع بعد.</p>
          ) : (
            <div className="stack">
              {entries.map((entry) => (
                <div className="panel subtle" key={entry.id}>
                  <strong>{entry.company || entry.channel}</strong>
                  <p className="muted">
                    {channelAr(entry.channel)} - الردود {entry.replies} - الاجتماعات {entry.meetingsBooked}
                  </p>
                  <p>{entry.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}

export function ExperimentsOperatingPage({ data }: { data: OperatingData }) {
  const experiments = data.experiments as AnyRecord[];
  const campaigns = data.campaigns as AnyRecord[];

  return (
    <SectionPage
      eyebrow="نظام التعلم"
      title="التجارب"
      description="اختبر فرضيات تسويقية صغيرة باحترافية بدون تنفيذ نشاط خارجي."
    >
      <ProductScopeFilter data={data} basePath="/experiments" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء تجربة</h2>
          <form action={createExperimentAction} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>المنتج</label>
                <ProductSelect />
              </div>
              <div className="field">
                <label>الحملة</label>
                <CampaignSelect campaigns={campaigns} />
              </div>
              <div className="field">
                <label>القناة</label>
                <select name="channel">
                  {channelOptions.map((channel) => (
                    <option key={channel} value={channel}>
                      {channelAr(channel)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>حجم الاختبار</label>
                <input defaultValue="10" min="0" name="testSize" type="number" />
              </div>
            </div>
            <div className="field">
              <label>الفرضية</label>
              <textarea name="hypothesis" required />
            </div>
            <div className="field">
              <label>الشريحة</label>
              <input name="segment" required />
            </div>
            <div className="field">
              <label>النسخة A</label>
              <textarea name="variantA" required />
            </div>
            <div className="field">
              <label>النسخة B</label>
              <textarea name="variantB" required />
            </div>
            <div className="field">
              <label>المؤشر</label>
              <input name="metric" required />
            </div>
            <button className="button" type="submit">
              <Icons.experiments size={18} />
              إنشاء تجربة
            </button>
          </form>
        </div>
        <div className="panel">
          <h2 className="section-title">التجارب</h2>
          {experiments.length === 0 ? (
            <p className="muted">لا توجد تجارب بعد.</p>
          ) : (
            <div className="stack">
              {experiments.map((experiment) => (
                <div className="panel subtle" key={experiment.id}>
                  <strong>{experiment.hypothesis}</strong>
                  <p className="muted">{experiment.product?.name} - {channelAr(experiment.channel)}</p>
                  <Link className="button secondary" href={`/experiments/${experiment.id}`}>
                    <Icons.experiments size={18} />
                    فتح التجربة
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}

export function AgencyMemoryOperatingPage({ data }: { data: OperatingData }) {
  const memories = data.agencyMemories as AnyRecord[];
  const campaigns = data.campaigns as AnyRecord[];

  return (
    <SectionPage
      eyebrow="ذاكرة التعلم"
      title="ذاكرة الوكالة"
      description="احفظ التعلم الذي يجب أن تستخدمه المسودات القادمة قبل إنشاء حملات جديدة."
    >
      <ProductScopeFilter data={data} basePath="/agency-memory" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء رؤية ذاكرة</h2>
          <form action={createMemoryInsightAction} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>المنتج</label>
                <OptionalProductSelect />
              </div>
              <div className="field">
                <label>الحملة</label>
                <CampaignSelect campaigns={campaigns} />
              </div>
              <div className="field">
                <label>التصنيف</label>
                <select name="category">
                  {memoryCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {memoryCategoryLabels[category] ?? category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>الثقة</label>
                <input defaultValue="70" max="100" min="0" name="confidence" type="number" />
              </div>
            </div>
            <div className="field">
              <label>العنوان</label>
              <input name="title" required />
            </div>
            <div className="field">
              <label>المصدر</label>
              <input name="source" required />
            </div>
            <div className="field">
              <label>الرؤية</label>
              <textarea name="insight" required />
            </div>
            <div className="field">
              <label>التوصية</label>
              <textarea name="recommendation" required />
            </div>
            <button className="button" type="submit">
              <Icons.brain size={18} />
              حفظ الذاكرة
            </button>
          </form>
        </div>
        <div className="panel">
          <h2 className="section-title">الذاكرة</h2>
          {memories.length === 0 ? (
            <p className="muted">لا توجد رؤى ذاكرة بعد.</p>
          ) : (
            <div className="stack">
              {memories.map((memory) => (
                <div className="panel subtle" key={memory.id}>
                  <div className="split-row">
                    <strong>{memory.title}</strong>
                    <span className="badge">{memory.confidence}%</span>
                  </div>
                  <p className="muted">{memory.product?.name ?? "عام"} - {memoryCategoryLabels[memory.category] ?? memory.category}</p>
                  <p>{memory.insight}</p>
                  <Link className="button secondary" href={`/agency-memory/${memory.id}`}>
                    <Icons.brain size={18} />
                    فتح الذاكرة
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}

export function ReportsOperatingPage({ data }: { data: OperatingData }) {
  const reports = data.reports as AnyRecord[];
  const campaigns = data.campaigns as AnyRecord[];

  return (
    <SectionPage
      eyebrow="التقارير"
      title="التقارير"
      description="أنشئ تقارير Markdown جاهزة للتصدير والمراجعة. لا تحدث مشاركة خارجية تلقائيًا."
    >
      <ProductScopeFilter data={data} basePath="/reports" />
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء تقرير</h2>
          <form action={createReportAction} className="stack">
            <div className="form-grid">
              <div className="field">
                <label>المنتج</label>
                <OptionalProductSelect />
              </div>
              <div className="field">
                <label>الحملة</label>
                <CampaignSelect campaigns={campaigns} />
              </div>
              <div className="field">
                <label>نوع التقرير</label>
                <select name="type">
                  {reportTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {reportTypeLabels[type] ?? type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>العنوان</label>
                <input name="title" required />
              </div>
            </div>
            <div className="field">
              <label>الملخص</label>
              <textarea name="summary" required />
            </div>
            {["whatWasDone", "whatWorked", "whatDidNotWork", "recommendations", "nextWeekPlan"].map((field) => (
              <div className="field" key={field}>
                <label>{metricLabels[field] ?? field}</label>
                <textarea name={field} placeholder="عنصر واحد في كل سطر" />
              </div>
            ))}
            <button className="button" type="submit">
              <Icons.file size={18} />
              إنشاء تقرير
            </button>
          </form>
        </div>
        <div className="panel">
          <h2 className="section-title">التقارير</h2>
          {reports.length === 0 ? (
            <p className="muted">لا توجد تقارير بعد.</p>
          ) : (
            <div className="stack">
              {reports.map((report) => (
                <div className="panel subtle" key={report.id}>
                  <div className="split-row">
                    <strong>{report.title}</strong>
                    <span className="badge warning">{statusAr(report.status)}</span>
                  </div>
                  <p className="muted">{report.product?.name ?? "عام"} - {reportTypeLabels[report.type] ?? report.type}</p>
                  <Link className="button secondary" href={`/reports/${report.id}`}>
                    <Icons.file size={18} />
                    فتح التقرير
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SectionPage>
  );
}
