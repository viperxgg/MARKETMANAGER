const notices: Record<string, { type: "success" | "warning" | "error"; message: string }> = {
  "test-email-sent": {
    type: "success",
    message:
      "تم إرسال بريد الاختبار. تحقق من صندوق الوارد. إذا لم يصل خلال دقيقتين، تحقق من إعدادات Resend وتحقق المجال."
  },
  "test-email-disabled": {
    type: "warning",
    message:
      "ENABLE_EMAIL ما زال false. لن يتم إرسال أي بريد حتى تقوم بتفعيل العلم يدويًا."
  },
  "test-email-recipient-rejected": {
    type: "error",
    message: "The test email recipient must match OWNER_EMAIL."
  },
  "test-email-not-configured": {
    type: "error",
    message:
      "Resend غير مضبوط. تحقق من RESEND_API_KEY و RESEND_FROM."
  },
  "test-email-failed": {
    type: "error",
    message:
      "فشل إرسال بريد الاختبار. راجع آخر صف في ExecutionLog لمعرفة السبب الدقيق."
  },
  "github-test-ok": {
    type: "success",
    message: "تم استدعاء GitHub بنجاح. آخر commit ظاهر في الأسفل."
  },
  "github-test-disabled": {
    type: "warning",
    message: "ENABLE_GITHUB ما زال false. التشغيل تم تسجيله في ExecutionLog ولم يحدث استدعاء فعلي."
  },
  "github-test-not-configured": {
    type: "error",
    message: "GitHub غير مضبوط. تحقق من GITHUB_TOKEN و GITHUB_REPO."
  },
  "github-test-failed": {
    type: "error",
    message: "فشل اختبار GitHub. راجع آخر صف في ExecutionLog لمعرفة السبب."
  },
  "vercel-test-ok": {
    type: "success",
    message: "تم استدعاء Vercel بنجاح. آخر النشرات ظاهرة في الأسفل."
  },
  "vercel-test-disabled": {
    type: "warning",
    message: "ENABLE_VERCEL ما زال false. التشغيل تم تسجيله في ExecutionLog ولم يحدث استدعاء فعلي."
  },
  "vercel-test-not-configured": {
    type: "error",
    message: "Vercel غير مضبوط. تحقق من VERCEL_TOKEN و VERCEL_PROJECT_ID."
  },
  "vercel-test-failed": {
    type: "error",
    message: "فشل اختبار Vercel. راجع آخر صف في ExecutionLog لمعرفة السبب."
  },
  "workflow-completed": {
    type: "success",
    message: "اكتمل سير العمل بنجاح. راجع مركز الموافقات للخطوات التالية."
  },
  "workflow-partial": {
    type: "warning",
    message: "اكتمل سير العمل جزئيًا. راجع سجل التشغيل لمعرفة الخطوات المتبقية."
  },
  "workflow-failed": {
    type: "error",
    message: "فشل سير العمل. راجع التحذيرات في سجل التشغيل وحاول مرة أخرى."
  },
  "daily-run-created": {
    type: "success",
    message: "تم إنشاء التشغيل اليومي كمسودة. لم يتم إرسال أو نشر أي شيء."
  },
  "metric-recorded": {
    type: "success",
    message: "تم تسجيل المؤشر اليدوي وإضافته إلى ذاكرة الوكالة."
  },
  "products-seeded": {
    type: "success",
    message: "تمت مزامنة المنتجات مع قاعدة البيانات."
  },
  "post-draft-created": {
    type: "success",
    message: "تم إنشاء مسودات المنشورات لمراجعة المالك."
  },
  "content-studio-created": {
    type: "success",
    message: "أنشأ استوديو المحتوى مسودة فيسبوك وأرسلها لمراجعة المالك. لم يتم نشر أي شيء."
  },
  "content-studio-error": {
    type: "error",
    message: "تعذر إنشاء مسودة فيسبوك. تحقق من إعدادات OpenAI وحدود سياق المنتج."
  },
  "openai-config-missing": {
    type: "warning",
    message: "OpenAI غير مضبوط على الخادم. أضف OPENAI_API_KEY و OPENAI_MODEL. لم يتم توليد أو حفظ أي نتيجة ذكاء اصطناعي وهمية."
  },
  "facebook-image-created": {
    type: "success",
    message: "تم توليد صورة فيسبوك وحفظها كأصل مسودة مرتبط بالمنشور. لم يتم نشر أي شيء."
  },
  "image-config-missing": {
    type: "warning",
    message: "توليد الصور غير مضبوط. أضف OPENAI_API_KEY وOPENAI_IMAGE_MODEL على الخادم، ولم يتم إنشاء صورة وهمية."
  },
  "image-generation-error": {
    type: "error",
    message: "تعذر توليد صورة فيسبوك. لم يتم حفظ صورة ولم يحدث أي نشر."
  },
  "card-dismissed": {
    type: "success",
    message: "تم إخفاء البطاقة من هذا العرض فقط. السجل الأصلي بقي محفوظًا في التاريخ أو الموافقات أو الذاكرة."
  },
  "card-restored": {
    type: "success",
    message: "تمت إعادة إظهار البطاقة في العرض."
  },
  "lead-task-created": {
    type: "success",
    message: "تم إنشاء مهمة بحث العملاء لمراجعة المالك."
  },
  "manual-csv-import-created": {
    type: "success",
    message: "اكتمل استيراد CSV اليدوي. تم حفظ العملاء المقبولين ومسودات البريد للمراجعة فقط."
  },
  "manual-csv-import-error": {
    type: "error",
    message: "فشل استيراد CSV اليدوي. تحقق من الأعمدة وإعدادات OpenAI وحدود سياق المنتج."
  },
  "live-lead-rejected": {
    type: "warning",
    message: "تم وضع العميل الناتج عن البحث الحي كغير مناسب. لم يتم إرسال أي بريد."
  },
  "live-lead-config-missing": {
    type: "warning",
    message: "Live lead research did not run because provider, database, or OpenAI configuration is missing."
  },
  "live-lead-run-empty": {
    type: "warning",
    message: "Live lead research ran but did not save any qualified leads."
  },
  "live-lead-run-completed": {
    type: "success",
    message: "Live lead research completed. Review any saved leads, drafts, and approval items before manual use."
  },
  "live-lead-run-failed": {
    type: "error",
    message: "Live lead research failed. No email was sent and no company was contacted automatically."
  },
  "campaign-brief-created": {
    type: "success",
    message: "تم إنشاء موجز الحملة. هو جاهز استراتيجيًا لكنه ما زال بحاجة إلى موافقة."
  },
  "lead-imported": {
    type: "success",
    message: "تم استيراد العميل المحتمل. سيبقى كمسودة حتى تكتمل قواعد الملاءمة والتحقق."
  },
  "lead-qualified": {
    type: "success",
    message: "تم تأهيل العميل لأن درجة الملاءمة ومصدر البريد الرسمي مكتملان."
  },
  "lead-not-qualified": {
    type: "warning",
    message: "لا يمكن إنشاء مسودة تواصل لهذا العميل بعد. يحتاج إلى درجة ملاءمة 85 أو أكثر وبريد رسمي مع مصدره."
  },
  "website-analysis-created": {
    type: "success",
    message: "تم حفظ تحليل الموقع كصياغة فرصة داخلية فقط."
  },
  "contact-verified": {
    type: "success",
    message: "تم حفظ التحقق من جهة الاتصال الرسمية. لم يتم إرسال أي بريد."
  },
  "outreach-draft-created": {
    type: "success",
    message: "تم إنشاء مسودة التواصل لمراجعة المالك. لم يتم إرسال أي بريد."
  },
  "social-draft-created": {
    type: "success",
    message: "تم إنشاء مسودة محتوى اجتماعي لمراجعة المالك. لم يتم نشر أي منشور."
  },
  "experiment-created": {
    type: "success",
    message: "تم إنشاء التجربة كفرضية مسودة."
  },
  "memory-created": {
    type: "success",
    message: "تم حفظ ملاحظة في ذاكرة الوكالة للحملات القادمة."
  },
  "report-created": {
    type: "success",
    message: "تم إنشاء التقرير بصيغة Markdown جاهزة للمراجعة وإضافته للموافقات."
  },
  "lead-report-created": {
    type: "success",
    message: "تم إنشاء تقرير بحث العملاء من العملاء المستوردين وإضافته للمراجعة."
  },
  "agency-brain-created": {
    type: "success",
    message: "تم حفظ نتيجة عقل الوكالة كتقرير مسودة. التوصيات التي تحتاج موافقة أُرسلت للمراجعة."
  },
  "agency-brain-error": {
    type: "error",
    message: "تعذر تشغيل عقل الوكالة. تحقق من إعدادات OpenAI على الخادم ثم حاول مرة أخرى."
  },
  "persistence-test-created": {
    type: "success",
    message: "تم إنشاء سجلات اختبار الحفظ الداخلي. راجع Prisma Studio."
  },
  "approval-approve": {
    type: "success",
    message: "تمت موافقة المالك على العنصر. لا يزال يحتاج تنفيذًا يدويًا ولم يتم إرساله أو نشره."
  },
  "approval-request_revision": {
    type: "warning",
    message: "تم طلب تعديل. يبقى العنصر محظورًا من التنفيذ اليدوي."
  },
  "approval-reject": {
    type: "warning",
    message: "تم رفض العنصر. لم يتم إرسال أو نشر أي شيء."
  },
  "approval-mark_reviewed": {
    type: "success",
    message: "تم وضع العنصر كمراجع. أي إجراء خارجي لا يزال يحتاج تنفيذًا يدويًا."
  },
  "facebook-published": {
    type: "success",
    message: "Post published to Facebook."
  },
  "facebook-not-configured": {
    type: "warning",
    message: "Facebook not configured. أضف META_PAGE_ID و META_ACCESS_TOKEN على الخادم، ولم يتم نشر أي شيء."
  },
  "facebook-publish-failed": {
    type: "error",
    message: "فشل نشر المنشور على فيسبوك. تم حفظ محاولة النشر والنتيجة بدون عرض أي أسرار."
  },
  "facebook-publish-invalid": {
    type: "error",
    message: "هذا العنصر ليس مسودة فيسبوك قابلة للنشر."
  },
  "facebook-already-published": {
    type: "warning",
    message: "هذه المسودة منشورة مسبقًا على فيسبوك."
  },
  "db-missing": {
    type: "warning",
    message: "لم يتم إعداد DATABASE_URL بعد. تم التحقق من الطلب لكنه لم يُحفظ."
  },
  "db-error": {
    type: "error",
    message: "فشل إجراء قاعدة البيانات. تحقق من DATABASE_URL وشغّل Prisma db push."
  },
  invalid: {
    type: "error",
    message: "بيانات النموذج غير صالحة."
  }
};

const workflowNoticeCodes = new Set([
  "workflow-completed",
  "workflow-partial",
  "workflow-failed"
]);

export function Notice({ code, runId }: { code?: string; runId?: string }) {
  if (!code || !notices[code]) {
    return null;
  }

  const notice = notices[code];
  const showTraceLink = runId && workflowNoticeCodes.has(code);

  return (
    <div className={`notice ${notice.type}`}>
      <span>{notice.message}</span>
      {showTraceLink ? (
        <>
          {" "}
          <a className="notice-link" href={`/workflows/${runId}`}>
            عرض سجل التشغيل ←
          </a>
        </>
      ) : null}
    </div>
  );
}
