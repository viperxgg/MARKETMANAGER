import { AppShell } from "@/components/app-shell";

const steps = [
  "تحميل سياق المنتج",
  "فحص جهات الاتصال السابقة",
  "البحث في السوق",
  "تقييم العملاء",
  "صياغة رسائل مخصصة",
  "حفظ النتائج للمراجعة"
];

export default function LoadingLiveLeadResearch() {
  return (
    <AppShell>
      <div className="stack large">
        <div>
          <div className="eyebrow">بحث العملاء الحي</div>
          <h1 className="page-title">جارٍ البحث عن أفضل عملاء اليوم...</h1>
          <p className="muted">
            يفحص التطبيق سياق المنتج وجهات الاتصال السابقة ونتائج السوق وسجل الموافقات.
          </p>
        </div>
        <section className="panel">
          <ol className="research-steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
