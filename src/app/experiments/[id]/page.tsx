import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getExperimentDetail } from "@/lib/data-service";
import { channelAr, statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export default async function ExperimentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const experiment = await getExperimentDetail(id);

  if (!experiment) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">تفاصيل التجربة</div>
            <h1 className="page-title">فرضية تسويقية</h1>
            <p className="muted">سجل تجربة كمسودة. لا ينفذ تواصلًا أو نشرًا.</p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(experiment.status)}</span>
            <span className="badge">{channelAr(experiment.channel)}</span>
          </div>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الفرضية</h2>
            <p>{experiment.hypothesis}</p>
            <p className="muted">{experiment.segment}</p>
          </div>
          <div className="panel">
            <h2 className="section-title">إعداد الاختبار</h2>
            <ul className="list bullets">
              <li>المنتج: {experiment.product.name}</li>
              <li>حجم الاختبار: {experiment.testSize}</li>
              <li>المؤشر: {experiment.metric}</li>
              <li>التنفيذ اليدوي مطلوب: {String(experiment.manual_execution_required)}</li>
            </ul>
          </div>
        </section>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">النسخة A</h2>
            <p>{experiment.variantA}</p>
          </div>
          <div className="panel">
            <h2 className="section-title">النسخة B</h2>
            <p>{experiment.variantB}</p>
          </div>
        </section>

        {experiment.campaign ? (
          <Link className="button secondary" href={`/campaigns/${experiment.campaign.id}`}>
            <Icons.file size={18} />
            فتح الحملة
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}
