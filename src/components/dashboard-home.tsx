import Link from "next/link";
import { recordManualMetricAction, runTodayAction, seedProductsAction } from "@/app/actions";
import { DashboardData } from "@/lib/data-service";
import { todayRecommendedActions, topOpportunities } from "@/lib/operating-system";
import { getLeadScoringRules } from "@/lib/scoring";
import { channelAr, scopeAr, statusAr } from "@/lib/ui-ar";
import { Icons } from "./icons";

function ProductFilter({ data }: { data: DashboardData }) {
  const options = [
    { href: "/", label: "كل المنتجات", active: data.productFilter === "all" },
    ...data.products.map((product) => ({
      href: `/?product=${product.slug}`,
      label: product.name,
      active: data.productFilter === product.slug
    })),
    { href: "/?product=global", label: "عام", active: data.productFilter === "global" }
  ];

  return (
    <div className="button-row" aria-label="فلتر المنتجات">
      {options.map((option) => (
        <Link className={`button compact ${option.active ? "" : "secondary"}`} href={option.href} key={option.label}>
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function DashboardHome({ data }: { data: DashboardData }) {
  const visibleProducts =
    data.productFilter === "all"
      ? data.products
      : data.productFilter === "global"
        ? []
        : data.products.filter((product) => product.slug === data.productFilter);
  const visibleOpportunities = topOpportunities.filter(
    (opportunity) =>
      data.productFilter === "all" ||
      opportunity.product === data.productFilterLabel ||
      (data.productFilter === "global" && opportunity.product === "عام")
  );

  return (
    <div className="stack large">
      <div className="topbar">
        <div>
          <div className="eyebrow">غرفة التشغيل اليومية</div>
          <h1 className="page-title">مركز القيادة</h1>
          <p className="muted">
            الاستراتيجية، بحث العملاء، إنتاج المحتوى، الموافقات، التتبع، وذاكرة التعلم.
            الإرسال والنشر المباشران معطلان.
          </p>
          <p className="muted">النطاق الحالي: {scopeAr(data.productFilterLabel)}</p>
        </div>
        <div className="button-row">
          <form action={runTodayAction}>
            {data.productFilter !== "all" && data.productFilter !== "global" ? (
              <input name="productSlug" type="hidden" value={data.productFilter} />
            ) : null}
            <button className="button" type="submit">
              <Icons.play size={18} />
              تشغيل اليوم
            </button>
          </form>
          <form action={seedProductsAction}>
            <button className="button secondary" type="submit">
              <Icons.check size={18} />
              مزامنة المنتجات
            </button>
          </form>
        </div>
      </div>

      <ProductFilter data={data} />

      <div className="grid three">
        <div className="panel stat">
          <span className="muted">الحملات النشطة</span>
          <span className="stat-value">{data.commandStats.activeCampaigns}</span>
        </div>
        <div className="panel stat">
          <span className="muted">بانتظار الموافقة</span>
          <span className="stat-value">{data.commandStats.pendingApprovals}</span>
        </div>
        <div className="panel stat">
          <span className="muted">قاعدة البيانات</span>
          <span className="stat-value">{data.dbConnected ? "جاهزة" : "معاينة"}</span>
        </div>
      </div>

      {!data.dbConnected ? (
        <div className="notice warning">
          DATABASE_URL غير مضبوط. يعمل النظام في وضع المعاينة: الصفحات والقوالب والمسودات آمنة،
          لكن الإجراءات لا تُحفظ حتى يتم إعداد PostgreSQL.
        </div>
      ) : null}

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">التحليل والتحسين اليومي</h2>
          <div className="stack">
            {data.latestDailyRuns.map((run) => (
              <div className="panel subtle" key={run.id}>
                <div className="split-row">
                  <strong>{run.productName}</strong>
                  <span className="badge warning">{statusAr(run.status)}</span>
                </div>
                <p className="muted">{run.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">ذاكرة الوكالة</h2>
          <div className="stack">
            {data.memoryInsights.map((insight) => (
              <div className="panel subtle" key={insight.id}>
                <div className="split-row">
                  <strong>{insight.title}</strong>
                  <span className="badge">{insight.confidence}%</span>
                </div>
                <p className="muted">{insight.productName}</p>
                <p>{insight.insight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">إجراءات اليوم المقترحة</h2>
          <ul className="list bullets">
            {todayRecommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
            <li>
              {data.productFilter === "all"
                ? "راجع كل المنتجات بدون اعتبار أي منتج هو المنتج الافتراضي للشركة."
                : `أبقِ العمل ضمن نطاق ${scopeAr(data.productFilterLabel)}.`}
            </li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">أفضل الفرص</h2>
          <div className="stack">
            {visibleOpportunities.map((opportunity) => (
              <div className="panel subtle" key={opportunity.product}>
                <strong>{opportunity.product}</strong>
                <p>{opportunity.opportunity}</p>
                <p className="muted">{opportunity.nextAction}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="split-row">
          <div>
            <h2 className="section-title">المنتجات</h2>
            <p className="muted">كل منتج له توليد منشورات يومية، ومهام بحث عملاء، ومسودات تواصل، وذاكرة مستقلة.</p>
          </div>
        </div>
        <div className="grid two">
          {visibleProducts.map((product) => (
            <article className="panel subtle" key={product.slug}>
              <div className="stack">
                <div>
                  <h3>{product.name}</h3>
                  <p className="muted">{product.shortDescription}</p>
                </div>
                <ul className="list bullets">
                  {product.benefits.slice(0, 3).map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <Link className="button secondary" href={`/products/${product.slug}`}>
                  <Icons.file size={18} />
                  فتح مساحة المنتج
                </Link>
              </div>
            </article>
          ))}
          {visibleProducts.length === 0 ? (
            <div className="panel subtle">
              <strong>Smart Art AI Solutions</strong>
              <p className="muted">
                النطاق العام يعرض ذاكرة التشغيل والموافقات على مستوى الشركة بدون محتوى خاص بمنتج محدد.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">التتبع اليدوي</h2>
        <form action={recordManualMetricAction} className="stack">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="productSlug">المنتج</label>
              <select
                id="productSlug"
                name="productSlug"
                defaultValue={
                  data.productFilter !== "all" && data.productFilter !== "global" ? data.productFilter : ""
                }
              >
                <option value="">عام</option>
                {data.products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="channel">القناة</label>
              <select id="channel" name="channel" required>
                <option value="facebook">{channelAr("facebook")}</option>
                <option value="instagram">{channelAr("instagram")}</option>
                <option value="linkedin">{channelAr("linkedin")}</option>
                <option value="email">{channelAr("email")}</option>
                <option value="manual">{channelAr("manual")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="metricDate">التاريخ</label>
              <input id="metricDate" name="metricDate" type="date" required />
            </div>
            <div className="field">
              <label htmlFor="impressions">الظهور</label>
              <input id="impressions" min="0" name="impressions" type="number" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor="company">الشركة</label>
              <input id="company" name="company" placeholder="شركة اختيارية" />
            </div>
            <div className="field">
              <label htmlFor="subject">الموضوع</label>
              <input id="subject" name="subject" placeholder="موضوع البريد أو عنوان المنشور" />
            </div>
            <div className="field">
              <label htmlFor="clicks">النقرات</label>
              <input id="clicks" min="0" name="clicks" type="number" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor="replies">الردود</label>
              <input id="replies" min="0" name="replies" type="number" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor="bookings">الحجوزات</label>
              <input id="bookings" min="0" name="bookings" type="number" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor="meetingsBooked">الاجتماعات</label>
              <input id="meetingsBooked" min="0" name="meetingsBooked" type="number" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor="conversions">التحويلات</label>
              <input id="conversions" min="0" name="conversions" type="number" defaultValue="0" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">ملاحظات</label>
            <textarea id="notes" name="notes" placeholder="ماذا حدث؟ ما الذي نجح؟ وما الذي يجب تغييره غدًا؟" />
          </div>
          <button className="button secondary" type="submit">
            <Icons.check size={18} />
            تسجيل المؤشر
          </button>
        </form>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">قواعد جودة العملاء المحتملين</h2>
          <ul className="list bullets">
            {getLeadScoringRules().map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="panel" id="approval-center">
          <h2 className="section-title">مركز الموافقات</h2>
          <div className="stack">
            {data.approvalItems.map((item) => (
              <div className="panel subtle" key={item.id}>
                <div className="split-row">
                  <strong>{item.itemType}</strong>
                  <span className="badge warning">{statusAr(item.status)}</span>
                </div>
                <p className="muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
