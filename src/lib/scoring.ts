export type LeadScoreBreakdown = {
  productFit: number;
  visibleNeed: number;
  marketRelevance: number;
  contactConfidence: number;
  timingOpportunity: number;
};

export const scoreWeights: LeadScoreBreakdown = {
  productFit: 25,
  visibleNeed: 25,
  marketRelevance: 20,
  contactConfidence: 15,
  timingOpportunity: 15
};

export function getQualifiedThreshold() {
  return 85;
}

export function getLeadScoringRules() {
  return [
    "درجة الملاءمة هي مؤشر تأهيل وليست ضمانًا للبيع.",
    "يُعد العميل مؤهلًا فقط عند درجة ملاءمة 85 أو أكثر.",
    "مصدر اتصال رسمي مطلوب. أنماط البريد المتوقعة أو المخمنة مرفوضة.",
    "يجب أن يأتي مصدر البريد من صفحة رسمية مثل الاتصال أو من نحن أو التذييل أو الحجز أو صفحة مشابهة.",
    "زاوية التواصل يجب أن تكون مبنية على فرصة محترمة ولا تنتقد الشركة.",
    "التوزيع: ملاءمة المنتج 0-25، الحاجة الظاهرة 0-25، صلة السوق 0-20، ثقة الاتصال 0-15، التوقيت والفرصة 0-15."
  ];
}
