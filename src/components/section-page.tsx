import Link from "next/link";
import { createCampaignBriefAction, createPersistenceSmokeTestAction } from "@/app/actions";
import type { DatabaseStatus } from "@/lib/db";
import {
  buildCampaignBriefTemplate,
  buildOutreachPromptTemplate,
  buildVisualPromptTemplate,
  campaignWorkflow,
  emailStatuses,
  leadStatuses,
  memoryCategories,
  postTypes,
  reportTypes,
  statusBadges
} from "@/lib/operating-system";
import { products } from "@/lib/product-data";
import { getLeadScoringRules } from "@/lib/scoring";
import type { ProductsOverviewData } from "@/lib/data-service";
import { channelAr, statusAr } from "@/lib/ui-ar";
import { Icons } from "./icons";

type SectionPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  safeMode?: string;
  children: React.ReactNode;
};

export function SectionPage({
  title,
  eyebrow,
  description,
  safeMode = "المسودة أولًا. التنفيذ يدوي فقط. approved_by_owner مطلوب.",
  children
}: SectionPageProps) {
  return (
    <div className="stack large">
      <div className="topbar">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <span className="badge warning">{safeMode}</span>
      </div>
      <div className="notice warning">
        النظام يقترح ويحفظ مسودات فقط. لا يوجد إرسال أو نشر أو تواصل خارجي بدون موافقة يدوية.
      </div>
      {children}
    </div>
  );
}

export function ProductsSection({ data }: { data: ProductsOverviewData }) {
  return (
    <SectionPage
      eyebrow="نقطة البداية"
      title="المنتجات"
      description="ابدأ من المنتج، افتح مساحة العمل، ثم اختر مهمة يومية واضحة. كل إجراء يبقى خاصًا بسياق المنتج."
    >
      <div className="grid two">
        {data.products.map((product) => (
          <article className="panel" key={product.slug}>
            <div className="stack">
              <div className="split-row">
                <h2 className="section-title">{product.name}</h2>
                <span className="badge">{product.status}</span>
              </div>
              <p>{product.positioning}</p>
              <p className="muted">{product.targetAudience}</p>
              <div className="grid three compact-grid">
                <div className="panel subtle stat">
                  <span className="muted">الحملات</span>
                  <span className="stat-value">{product.campaignsCount}</span>
                </div>
                <div className="panel subtle stat">
                  <span className="muted">الموافقات</span>
                  <span className="stat-value">{product.pendingApprovalsCount}</span>
                </div>
                <div className="panel subtle stat">
                  <span className="muted">المسودات</span>
                  <span className="stat-value">{product.recentDraftsCount}</span>
                </div>
              </div>
              <Link className="button secondary" href={`/products/${product.slug}`}>
                <Icons.file size={18} />
                فتح مساحة عمل المنتج
              </Link>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}

export function CampaignsSection() {
  return (
    <SectionPage
      eyebrow="الاستراتيجية"
      title="الحملات"
      description="إنشاء موجزات حملات منظمة قبل بحث العملاء أو إنتاج المحتوى أو صياغة التواصل."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إنشاء موجز حملة</h2>
          <form action={createCampaignBriefAction} className="stack">
            <div className="field">
              <label htmlFor="productSlug">المنتج</label>
              <select id="productSlug" name="productSlug" required defaultValue="">
                <option value="" disabled>
                  اختر المنتج
                </option>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="targetSegment">الشريحة المستهدفة</label>
              <input id="targetSegment" name="targetSegment" placeholder="شريحة المنتج المختارة في السويد" required />
            </div>
            <div className="field">
              <label htmlFor="objective">الهدف</label>
              <input id="objective" name="objective" placeholder="اختبار الاهتمام بمكالمة عرض قصيرة" required />
            </div>
            <div className="field">
              <label htmlFor="channel">القناة الأساسية</label>
              <select id="channel" name="channel" required>
                <option value="email">{channelAr("email")}</option>
                <option value="facebook">{channelAr("facebook")}</option>
                <option value="instagram">{channelAr("instagram")}</option>
                <option value="linkedin">{channelAr("linkedin")}</option>
                <option value="codex_research">{channelAr("codex_research")}</option>
                <option value="manual">{channelAr("manual")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="messageAngle">زاوية الرسالة</label>
              <input id="messageAngle" name="messageAngle" placeholder="رحلة عميل أبسط بدون ضغط" required />
            </div>
            <button className="button" type="submit">
              <Icons.file size={18} />
              إنشاء الموجز
            </button>
          </form>
        </div>
        <div className="panel">
          <h2 className="section-title">سير العمل</h2>
          <ul className="list bullets">
            {campaignWorkflow.map((status) => (
              <li key={status}>{statusAr(status)}</li>
            ))}
          </ul>
          <pre className="code-block">{buildCampaignBriefTemplate()}</pre>
        </div>
      </section>
    </SectionPage>
  );
}

export function LeadsSection() {
  return (
    <SectionPage
      eyebrow="خط العملاء"
      title="العملاء المحتملون"
      description="عرض CRM خفيف لحالة العميل ودرجة الملاءمة والثقة والتحقق من البريد الرسمي والمتابعة اليدوية."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">حالات العملاء</h2>
          <ul className="list bullets">
            {leadStatuses.map((status) => (
              <li key={status}>{statusAr(status)}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">قواعد التأهيل</h2>
          <ul className="list bullets">
            {getLeadScoringRules().map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    </SectionPage>
  );
}

export function LeadResearchSection() {
  return (
    <SectionPage
      eyebrow="البحث"
      title="بحث العملاء"
      description="إعداد تعليمات بحث Codex لعشرين عميلًا تتم مراجعتهم بعناية مع التحقق من البريد الرسمي."
    >
      <div className="panel">
        <h2 className="section-title">وحدة البحث</h2>
        <div className="grid two">
          <ul className="list bullets">
            <li>اختيار المنتج</li>
            <li>الصناعة المستهدفة والمدينة أو المنطقة</li>
            <li>معايير العملاء والاستثناءات</li>
            <li>الحد الأدنى لدرجة الملاءمة: 85</li>
            <li>قالب مخرجات Codex</li>
          </ul>
          <ul className="list bullets">
            <li>لا عملاء عشوائيين</li>
            <li>لا بريد مخمّن</li>
            <li>صفحة اتصال أو من نحن أو تذييل أو حجز رسمية مطلوبة</li>
            <li>مستوى الثقة مطلوب</li>
            <li>العملاء دون 85 لا يمكن تأهيلهم</li>
          </ul>
        </div>
      </div>
    </SectionPage>
  );
}

export function WebsiteAnalysisSection() {
  return (
    <SectionPage
      eyebrow="تحليل داخلي"
      title="تحليل المواقع"
      description="تحليل رحلة العميل والوضوح والثقة وتجربة الهاتف وصياغة الفرصة. تبقى النتائج داخلية."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">حقول التحليل</h2>
          <ul className="list bullets">
            <li>وضوح العرض أو الخدمة</li>
            <li>رحلة العميل</li>
            <li>تجربة الهاتف</li>
            <li>وضوح الحجز أو التواصل</li>
            <li>الوضوح البصري وإشارات الثقة</li>
            <li>احتكاك التحويل</li>
            <li>سبب ملاءمة منتجنا</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">قاعدة الصياغة</h2>
          <p className="muted">سيئ: "موقعكم ضعيف".</p>
          <p>جيد: "هناك فرصة لجعل رحلة العميل أوضح وأسهل".</p>
        </div>
      </section>
    </SectionPage>
  );
}

export function OutreachStudioSection() {
  return (
    <SectionPage
      eyebrow="صياغة البريد"
      title="استوديو التواصل"
      description="إنشاء مسودات تواصل سويدية مخصصة ومراجعة للالتزام. لا يوجد إرسال مباشر."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">بنية البريد</h2>
          <ul className="list bullets">
            <li>الشركة</li>
            <li>الموضوع</li>
            <li>الافتتاحية</li>
            <li>الملاحظة</li>
            <li>الفرصة</li>
            <li>ارتباط المنتج</li>
            <li>دعوة إجراء لطيفة وخيار إلغاء مهذب</li>
            <li>قائمة الالتزام</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">قالب تعليمات Codex</h2>
          <pre className="code-block">{buildOutreachPromptTemplate()}</pre>
        </div>
      </section>
      <div className="panel">
        <h2 className="section-title">حالات البريد</h2>
        <div className="button-row">
          {emailStatuses.map((status) => (
            <span className="badge" key={status}>
              {statusAr(status)}
            </span>
          ))}
        </div>
      </div>
    </SectionPage>
  );
}

export function SocialStudioSection() {
  return (
    <SectionPage
      eyebrow="إنتاج المحتوى"
      title="استوديو المحتوى"
      description="تخطيط مسودات فيسبوك وإنستغرام ولينكدإن مع نصوص ووصف صور مناسب لكل منصة. لا يوجد نشر تلقائي."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">أنواع المنشورات</h2>
          <ul className="list bullets">
            {postTypes.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">تنسيق وصف الصورة</h2>
          <pre className="code-block">{buildVisualPromptTemplate()}</pre>
        </div>
      </section>
    </SectionPage>
  );
}

export function ApprovalCenterSection() {
  return (
    <SectionPage
      eyebrow="بوابة السلامة"
      title="مركز الموافقات"
      description="مراجعة البريد والمنشورات والحملات والعملاء ووصف الصور والتقارير قبل التنفيذ اليدوي."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إجراءات الموافقة</h2>
          <ul className="list bullets">
            <li>موافقة</li>
            <li>طلب تعديل</li>
            <li>رفض</li>
            <li>وضع كمراجع</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">قاعدة غير قابلة للتفاوض</h2>
          <p>
            حتى العناصر المعتمدة تبقى يدوية فقط: <strong>approved_by_owner = true</strong> و{" "}
            <strong>manual_execution_required = true</strong>.
          </p>
        </div>
      </section>
    </SectionPage>
  );
}

export function ManualTrackingSection() {
  return (
    <SectionPage
      eyebrow="التتبع"
      title="التتبع اليدوي"
      description="تتبع التواصل المنفذ يدويًا والردود والاجتماعات والتحويلات والإجراءات التالية كـ CRM خفيف."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">حقول CRM</h2>
          <ul className="list bullets">
            <li>الشركة والحملة</li>
            <li>تاريخ إرسال البريد والقناة</li>
            <li>الموضوع وحالة الرد</li>
            <li>مستوى الاهتمام</li>
            <li>تاريخ المتابعة</li>
            <li>الملاحظات والإجراء التالي والنتيجة</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">مؤشرات أسبوعية</h2>
          <ul className="list bullets">
            <li>الرسائل المرسلة</li>
            <li>الردود والردود الإيجابية</li>
            <li>الاجتماعات المحجوزة</li>
            <li>التحويلات</li>
            <li>أفضل موضوع وشريحة وزاوية رسالة</li>
          </ul>
        </div>
      </section>
    </SectionPage>
  );
}

export function ExperimentsSection() {
  return (
    <SectionPage
      eyebrow="نظام التعلم"
      title="التجارب"
      description="اختبار فرضيات تسويقية صغيرة مع نسخ ومؤشرات واستنتاجات وإجراءات تالية."
    >
      <div className="panel">
        <h2 className="section-title">مثال تجربة</h2>
        <pre className="code-block">{`الفرضية:
الشريحة المختارة تستجيب لرسائل الوضوح التشغيلي أفضل من الرسائل العامة على مستوى الشركة.

الحقول:
- المنتج
- الشريحة
- القناة
- حجم الاختبار
- النسخة A
- النسخة B
- المؤشر
- النتيجة
- الاستنتاج
- الإجراء التالي`}</pre>
      </div>
    </SectionPage>
  );
}

export function AgencyMemorySection() {
  return (
    <SectionPage
      eyebrow="ذاكرة التعلم"
      title="ذاكرة الوكالة"
      description="حفظ ما تتعلمه الوكالة حتى تستخدم الحملات القادمة الرسائل المثبتة وتتجنب الأنماط الضعيفة."
    >
      <div className="grid two">
        <div className="panel">
          <h2 className="section-title">تصنيفات الذاكرة</h2>
          <ul className="list bullets">
            {memoryCategories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">القاعدة</h2>
          <p>يجب أن تستخدم الحملات القادمة ذاكرة الوكالة قبل إنشاء مسودات جديدة.</p>
        </div>
      </div>
    </SectionPage>
  );
}

export function ReportsSection() {
  return (
    <SectionPage
      eyebrow="التقارير"
      title="التقارير"
      description="إنشاء تقارير Markdown جاهزة للتصدير للحملات والعملاء والتواصل والمحتوى والتموضع والتعلم."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">أنواع التقارير</h2>
          <ul className="list bullets">
            {reportTypes.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">تنسيق التقرير</h2>
          <pre className="code-block">{`# تقرير حملة أسبوعي

الملخص:
ما الذي تم:
الأرقام:
ما الذي نجح:
ما الذي لم ينجح:
التوصيات:
خطة الأسبوع القادم:`}</pre>
        </div>
      </section>
    </SectionPage>
  );
}

export function SettingsSection({ databaseStatus }: { databaseStatus: DatabaseStatus }) {
  const connected = databaseStatus.state === "connected";

  return (
    <SectionPage
      eyebrow="الجاهزية"
      title="الإعدادات"
      description="فحص جاهزية البيئة وحالة قاعدة البيانات ومهام المصادقة ووضع أمان التكاملات."
    >
      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">حالة النظام</h2>
          <div className="stack">
            <div className="split-row">
              <span>حالة قاعدة البيانات</span>
              <span className={`badge ${connected ? "" : "warning"}`}>
                {databaseStatus.label}
              </span>
            </div>
            <div className="split-row">
              <span>حالة المصادقة</span>
              <span className="badge warning">قيد التنفيذ</span>
            </div>
            <div className="split-row">
              <span>مزوّد البريد</span>
              <span className="badge warning">معطل</span>
            </div>
            <div className="split-row">
              <span>واجهات التواصل الاجتماعي</span>
              <span className="badge warning">معطلة</span>
            </div>
            <div className="split-row">
              <span>الوضع اليدوي</span>
              <span className="badge">true</span>
            </div>
          </div>
          <p className="muted">{databaseStatus.message}</p>
        </div>
        <div className="panel">
          <h2 className="section-title">تحذير</h2>
          <p>الإرسال والنشر المباشران معطلان. التنفيذ يدوي فقط.</p>
          <form action={createPersistenceSmokeTestAction} className="stack">
            <div className="field">
              <label htmlFor="smokeProductSlug">المنتج</label>
              <select id="smokeProductSlug" name="productSlug" required defaultValue="">
                <option value="" disabled>
                  اختر المنتج
                </option>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="button secondary" type="submit">
              <Icons.check size={18} />
              إنشاء بيانات اختبار الحفظ
            </button>
          </form>
          <pre className="code-block">{`أضف DATABASE_URL في:
C:\\Users\\azzam\\Documents\\marketagency\\.env

شكل الاتصال المباشر:
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

إذا أظهر Supabase أن الاتصال غير متوافق مع IPv4، استخدم رابط Session Pooler من:
Supabase Dashboard -> Project Settings -> Database -> Connection string -> Session pooler

ثم شغّل:
npm run db:generate
npm run db:push`}</pre>
          <div className="button-row">
            {statusBadges.map((badge) => (
              <span className="badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </SectionPage>
  );
}
