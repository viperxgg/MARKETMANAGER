import { products } from "./product-data";

export const statusBadges = [
  "مسودة",
  "يحتاج مراجعة",
  "معتمد",
  "التنفيذ اليدوي مطلوب",
  "قيد التتبع",
  "مكتمل"
];

export const campaignWorkflow = [
  "draft",
  "strategy_ready",
  "leads_ready",
  "drafts_ready",
  "owner_review",
  "approved_by_owner",
  "manually_executed",
  "tracking",
  "completed"
];

export const leadStatuses = [
  "discovered",
  "analyzed",
  "contact_verified",
  "qualified",
  "outreach_drafted",
  "owner_review",
  "approved_for_contact",
  "contacted_manually",
  "responded",
  "converted",
  "not_relevant",
  "closed"
];

export const emailStatuses = [
  "draft",
  "compliance_review",
  "needs_revision",
  "owner_review",
  "approved_by_owner",
  "sent_manually",
  "replied",
  "follow_up_needed",
  "closed"
];

export const postTypes = [
  "تعليمي",
  "بناء الثقة",
  "عرض المنتج",
  "مشكلة وحل",
  "أسلوب دراسة حالة",
  "خلف الكواليس",
  "عرض",
  "أسئلة شائعة",
  "معالجة الاعتراضات"
];

export const memoryCategories = [
  "رسائل ناجحة",
  "رسائل ضعيفة",
  "أفضل الشرائح",
  "شرائح غير مناسبة",
  "اعتراضات",
  "دعوات إجراء ناجحة",
  "دعوات إجراء ضعيفة",
  "أنماط بصرية",
  "رؤى السوق",
  "دروس الالتزام",
  "ملاحظات التسعير",
  "لغة العملاء"
];

export const reportTypes = [
  "تقرير حملة أسبوعي",
  "تقرير جودة العملاء المحتملين",
  "تقرير أداء التواصل",
  "تقرير المحتوى الاجتماعي",
  "تقرير تموضع المنتج",
  "تقرير تعلم شهري"
];

export const topOpportunities = [
  ...products.map((product) => ({
    product: product.name,
    opportunity: `${product.audience}: ${product.contentAngles[0]}.`,
    nextAction: `أنشئ حملة أو مهمة بحث عملاء لـ ${product.name} باستخدام سياق هذا المنتج فقط.`
  })),
  {
    product: "عام",
    opportunity:
      "يمكن لـ Smart Art AI Solutions مقارنة التعلم بين المنتجات بدون خلط الوعود أو الرسائل بين المنتجات.",
    nextAction: "راجع ذاكرة الوكالة وأبقِ الرؤى العامة منفصلة عن الحملات الخاصة بكل منتج."
  }
];

export const todayRecommendedActions = [
  "سجّل المؤشرات اليدوية من آخر منشور أو نشاط بريدي.",
  "اختر منتجًا قبل إنتاج أي محتوى خاص بمنتج.",
  "استخدم ذاكرة الوكالة للمنتج المحدد قبل صياغة منشور أو رسالة تواصل.",
  "لا تنقل أي عنصر إلى التنفيذ اليدوي إلا إذا كانت approved_by_owner تساوي true."
];

export function getProductOptions() {
  return products.map((product) => ({
    value: product.slug,
    label: product.name
  }));
}

export function buildCampaignBriefTemplate(productName = "[Selected product]") {
  return `# موجز الحملة

المنتج: ${productName}
الشريحة المستهدفة:
المشكلة أو الفرصة:
الرسالة الأساسية:
العرض:
القنوات:
معايير العميل المحتمل:
قواعد النبرة:
- تحميل سياق المنتج المحدد أولًا
- عدم خلط سياقات المنتجات
- محترمة
- هادئة
- مهنية
- مبنية على فرصة
- بدون نقد مباشر
- بدون وعود مبالغ فيها
- بدون ضغط

ملاحظات الالتزام:
- لا يوجد إرسال مباشر
- لا يوجد نشر مباشر
- approved_by_owner مطلوب
- manual_execution_required

مؤشرات النجاح:
- الردود
- الردود الإيجابية
- الاجتماعات المحجوزة
- العملاء المؤهلون
- التعلم المحفوظ`;
}

export function buildOutreachPromptTemplate() {
  return `أنشئ مسودة بريد تواصل مخصصة باللغة السويدية.

المدخلات المطلوبة:
- سياق المنتج المحدد
- اسم شركة العميل المحتمل
- الموقع الرسمي
- ملخص تحليل الموقع
- رابط مصدر البريد الرسمي
- أفضل زاوية دخول
- الادعاءات المحظورة الخاصة بالمنتج

المخرجات:
- الموضوع
- الافتتاحية
- الملاحظة
- الفرصة
- ارتباط المنتج
- دعوة إجراء لطيفة
- الخاتمة
- ملاحظة إلغاء التواصل عند الحاجة
- قائمة الالتزام

القواعد:
- تحميل سياق المنتج المحدد أولًا
- رفض خلط سياقات المنتجات
- إذا لم يتم اختيار منتج، اطلب اختيار منتج أو أنشئ محتوى عامًا على مستوى الشركة فقط
- اللغة السويدية
- نبرة طبيعية وإنسانية
- بدون صياغة عدوانية
- بدون نقد قائم على الإحراج
- بدون ضمان نتائج
- بدون اختراع بيانات عملاء
- status = owner_review
- approved_by_owner = false
- manual_execution_required = true`;
}

export function buildVisualPromptTemplate() {
  return `تنسيق وصف الصورة:

فكرة الصورة:
التكوين:
الأسلوب:
الألوان:
العناصر:
ما يجب تجنبه:
وصف الصورة بالإنجليزية:

القواعد:
- استخدم سياق المنتج المحدد فقط
- بدون لقطات شاشة مضللة
- بدون شعارات عملاء وهمية
- بدون رسوم مبيعات مبالغ فيها
- حافظ على إحساس تجاري سويدي راقٍ`;
}
