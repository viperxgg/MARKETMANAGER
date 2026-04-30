import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getReportDetail } from "@/lib/data-service";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const report = await getReportDetail(id);

  if (!report) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">معاينة التقرير</div>
            <h1 className="page-title">{report.title}</h1>
            <p className="muted">Markdown جاهز للتصدير والمراجعة اليدوية. لا توجد مشاركة خارجية مفعّلة.</p>
          </div>
          <div className="button-row">
            <span className="badge warning">{statusAr(report.status)}</span>
            <span className="badge">{report.type}</span>
          </div>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الملخص</h2>
            <p>{report.summary}</p>
            <div className="button-row">
              {report.campaign ? (
                <Link className="button secondary" href={`/campaigns/${report.campaign.id}`}>
                  <Icons.file size={18} />
                  فتح الحملة
                </Link>
              ) : null}
              <Link className="button secondary" href="/approval-center">
                <Icons.approval size={18} />
                مركز الموافقات
              </Link>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">السلامة</h2>
            <ul className="list bullets">
              <li>موافقة المالك: {String(report.approved_by_owner)}</li>
              <li>التنفيذ اليدوي مطلوب: {String(report.manual_execution_required)}</li>
              <li>لا يوجد نشر أو مشاركة تلقائية.</li>
            </ul>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Markdown</h2>
          <pre className="code-block">{report.markdown}</pre>
        </section>
      </div>
    </AppShell>
  );
}
