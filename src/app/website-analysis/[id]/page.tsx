import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getWebsiteAnalysisDetail } from "@/lib/data-service";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export default async function WebsiteAnalysisDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const analysis = await getWebsiteAnalysisDetail(id);

  if (!analysis) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">تحليل موقع داخلي</div>
            <h1 className="page-title">{analysis.lead.companyName}</h1>
            <p className="muted">
              تحليل داخلي فقط. يجب أن يستخدم التواصل صياغة الفرصة، لا النقد المباشر.
            </p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(analysis.status)}</span>
            <span className="badge">داخلي فقط: {String(analysis.internalOnly)}</span>
          </div>
        </div>

        <section className="grid three">
          {[
            ["وضوح العرض أو الخدمة", analysis.menuServiceClarity],
            ["رحلة العميل", analysis.customerJourney],
            ["تجربة الهاتف", analysis.mobileExperience],
            ["وضوح الحجز أو التواصل", analysis.bookingContactClarity],
            ["الوضوح البصري", analysis.visualClarity],
            ["إشارات الثقة", analysis.trustSignals]
          ].map(([label, value]) => (
            <div className="panel stat" key={label}>
              <span className="muted">{label}</span>
              <span className="stat-value">{value}/10</span>
            </div>
          ))}
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">النتائج الداخلية</h2>
            <div className="stack">
              <div>
                <strong>احتكاك التحويل</strong>
                <p>{analysis.conversionFriction}</p>
              </div>
              <div>
                <strong>صياغة الفرصة</strong>
                <p>{analysis.opportunityFraming}</p>
              </div>
              <div>
                <strong>ملاءمة المنتج</strong>
                <p>{analysis.productFitReason}</p>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">قاعدة التواصل الآمن</h2>
            <p className="muted">لا تقل: موقعكم ضعيف.</p>
            <p>استخدم: هناك فرصة لجعل رحلة العميل أوضح وأسهل.</p>
            <div className="button-row">
              <Link className="button secondary" href={`/leads/${analysis.lead.id}`}>
                <Icons.target size={18} />
                فتح العميل
              </Link>
              <a className="button secondary" href={analysis.lead.website} rel="noreferrer" target="_blank">
                <Icons.search size={18} />
                فتح الموقع
              </a>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
