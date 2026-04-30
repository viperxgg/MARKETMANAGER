import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icons } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getMemoryDetail } from "@/lib/data-service";
import { statusAr } from "@/lib/ui-ar";

export const dynamic = "force-dynamic";

export default async function MemoryDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const memory = await getMemoryDetail(id);

  if (!memory) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} />
      <div className="stack large">
        <div className="topbar">
          <div>
            <div className="eyebrow">ذاكرة الوكالة</div>
            <h1 className="page-title">{memory.title}</h1>
            <p className="muted">تعلم قابل لإعادة الاستخدام في الحملات والمسودات القادمة.</p>
          </div>
          <div className="button-row">
            <span className="badge">{memory.confidence}% ثقة</span>
            <span className="badge warning">{statusAr(memory.status)}</span>
          </div>
        </div>

        <section className="grid two">
          <div className="panel">
            <h2 className="section-title">الرؤية</h2>
            <p>{memory.insight}</p>
          </div>
          <div className="panel">
            <h2 className="section-title">التوصية</h2>
            <p>{memory.recommendation}</p>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">السياق</h2>
          <ul className="list bullets">
            <li>التصنيف: {memory.category}</li>
            <li>المصدر: {memory.source}</li>
            <li>المنتج: {memory.product?.name ?? "عام"}</li>
            <li>التنفيذ اليدوي مطلوب: {String(memory.manual_execution_required)}</li>
          </ul>
          {memory.campaign ? (
            <Link className="button secondary" href={`/campaigns/${memory.campaign.id}`}>
              <Icons.file size={18} />
              فتح الحملة
            </Link>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
