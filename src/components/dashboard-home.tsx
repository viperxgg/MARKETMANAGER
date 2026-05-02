import Link from "next/link";
import { runDailyFocusPipelineAction } from "@/app/actions";
import { DashboardData } from "@/lib/data-service";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";
import { scopeAr, statusAr } from "@/lib/ui-ar";
import { DismissCardButton, ShowDismissedToggle } from "./dismiss-card";
import { Icons } from "./icons";
import { SubmitButton } from "./submit-button";

function productFilterSuffix(data: DashboardData) {
  if (data.productFilter === "all") {
    return "";
  }

  return `?product=${data.productFilter}`;
}

export function DashboardHome({ data }: { data: DashboardData }) {
  const providerStatus = getLeadSearchProviderStatus();
  const basePath = `/${productFilterSuffix(data)}`;
  const returnTo = `${basePath}${data.showDismissed ? `${basePath.includes("?") ? "&" : "?"}showDismissed=1` : ""}`;
  const visibleProducts =
    data.productFilter === "all"
      ? data.products
      : data.productFilter === "global"
        ? []
        : data.products.filter((product) => product.slug === data.productFilter);
  const integrationWarnings = [
    !data.dbConnected ? "DATABASE_URL غير مضبوط: يعمل النظام في وضع معاينة آمن." : "",
    !providerStatus.openAiConfigured ? "OpenAI غير مضبوط: التحليل والتوليد سيبقيان في حالة آمنة." : "",
    !providerStatus.providerConfigured ? "مزوّد بحث العملاء غير مضبوط: لا يوجد بحث حي ولا عملاء وهميون." : "",
    "تكامل البريد غير متصل بعد.",
    "تكامل النشر الاجتماعي غير متصل بعد."
  ].filter(Boolean);

  return (
    <div className="stack large">
      <div className="topbar">
        <div>
          <div className="eyebrow">نظرة تشغيلية عالية المستوى</div>
          <h1 className="page-title">مركز القيادة</h1>
          <p className="muted">
            ابدأ من المنتجات. هذا المركز يعرض التركيز اليومي والتنبيهات فقط، بدون تنفيذ خارجي.
          </p>
          <p className="muted">النطاق الحالي: {scopeAr(data.productFilterLabel)}</p>
        </div>
        <div className="button-row">
          <form action={runDailyFocusPipelineAction}>
            {data.productFilter !== "all" && data.productFilter !== "global" ? (
              <input name="productSlug" type="hidden" value={data.productFilter} />
            ) : null}
            <SubmitButton className="button" pendingLabel="جارٍ تشغيل سير عمل تركيز اليوم...">
              <Icons.brain size={18} />
              تشغيل سير عمل تركيز اليوم
            </SubmitButton>
          </form>
          <Link className="button secondary" href="/products">
            <Icons.sparkles size={18} />
            المنتجات
          </Link>
          <Link className="button secondary" href="/approval-center">
            <Icons.approval size={18} />
            مركز الموافقات
          </Link>
        </div>
      </div>

      <section className="notice warning">
        النظام يقترح ويحفظ مسودات فقط. لا يوجد إرسال أو نشر أو تواصل خارجي بدون موافقة يدوية.
      </section>

      <section className="panel subtle">
        <div className="split-row">
          <div>
            <strong>مسار العمل</strong>
            <p className="muted">المنتجات → مساحة عمل المنتج → إجراء → مسودة → مركز الموافقات → تنفيذ يدوي لاحقًا</p>
          </div>
          <ShowDismissedToggle basePath={basePath} showDismissed={data.showDismissed} />
        </div>
      </section>

      {/* KPI counter cards — every value is a real query. No fake counts. */}
      <section className="grid three">
        <Link className="panel stat" href="/approval-center" aria-label="فتح مركز الموافقات">
          <span className="muted">موافقات معلّقة</span>
          <span className="stat-value">{data.commandStats.pendingApprovals}</span>
          <span className="muted" style={{ fontSize: 12 }}>
            بانتظار قرار المالك (إيميلات + منشورات + موافقات أخرى)
          </span>
        </Link>
        <Link className="panel stat" href="/approval-center" aria-label="فتح المسودات">
          <span className="muted">مسودات قيد المراجعة</span>
          <span className="stat-value">
            {data.commandStats.draftEmails + data.commandStats.draftPosts}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            {data.commandStats.draftEmails} بريد · {data.commandStats.draftPosts} منشور
          </span>
        </Link>
        <Link className="panel stat" href="/leads" aria-label="فتح صفحة العملاء">
          <span className="muted">عملاء بانتظار التحقق</span>
          <span className="stat-value">{data.commandStats.leadsToVerify}</span>
          <span className="muted" style={{ fontSize: 12 }}>
            contactStatus = not_verified / discovered
          </span>
        </Link>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">تركيز اليوم</h2>
          {data.latestDailyRuns.length === 0 ? (
            <p className="muted">لا يوجد تركيز يومي محفوظ بعد. افتح مساحة عمل منتج وابدأ من مهمة واضحة.</p>
          ) : (
            <div className="stack">
              {data.latestDailyRuns.map((run: any) => (
                <div className={`panel subtle ${run._dismissed ? "dismissed-card" : ""}`} key={run.id}>
                  <div className="split-row">
                    <strong>{run.productName}</strong>
                    <div className="button-row">
                      <span className="badge warning">{statusAr(run.status)}</span>
                      <DismissCardButton
                        itemId={run.id}
                        itemType={run._itemType ?? "daily_run"}
                        returnTo={returnTo}
                        isDismissed={run._dismissed}
                      />
                    </div>
                  </div>
                  <p className="muted">{run.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="section-title">تنبيهات التكامل</h2>
          <ul className="list bullets">
            {integrationWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2 className="section-title">المنتجات النشطة</h2>
          {visibleProducts.length === 0 ? (
            <p className="muted">النطاق العام لا يحتوي مساحة منتج. افتح صفحة المنتجات لاختيار مساحة عمل محددة.</p>
          ) : (
            <div className="stack">
              {visibleProducts.map((product) => (
                <Link className="panel subtle" href={`/products/${product.slug}`} key={product.slug}>
                  <strong>{product.name}</strong>
                  <p className="muted">{product.positioning}</p>
                  <span className="badge">فتح مساحة عمل المنتج</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel" id="approval-center">
          <h2 className="section-title">الموافقات المعلقة</h2>
          {data.approvalItems.length === 0 ? (
            <p className="muted">لا توجد بطاقات موافقة ظاهرة الآن.</p>
          ) : (
            <div className="stack">
              {data.approvalItems.slice(0, 6).map((item: any) => (
                <div className={`panel subtle ${item._dismissed ? "dismissed-card" : ""}`} key={`${item._itemType}-${item.id}`}>
                  <div className="split-row">
                    <strong>{item.itemType}</strong>
                    <div className="button-row">
                      <span className="badge warning">{statusAr(item.status)}</span>
                      <DismissCardButton
                        itemId={item.id}
                        itemType={item._itemType ?? "approval_item"}
                        returnTo={returnTo}
                        isDismissed={item._dismissed}
                      />
                    </div>
                  </div>
                  <p className="muted">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
