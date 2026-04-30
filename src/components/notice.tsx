const notices: Record<string, { type: "success" | "warning" | "error"; message: string }> = {
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

export function Notice({ code }: { code?: string }) {
  if (!code || !notices[code]) {
    return null;
  }

  const notice = notices[code];

  return <div className={`notice ${notice.type}`}>{notice.message}</div>;
}
