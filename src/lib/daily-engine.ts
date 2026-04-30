import { ProductSeed } from "./product-data";

export function buildDailySummary(product?: ProductSeed) {
  const scope = product ? product.name : "Smart Art AI Solutions";

  return {
    title: "التحليل والتحسين اليومي",
    summary:
      `${scope}: راجع النتائج اليدوية أولًا، ثم اقترح زاوية المحتوى التالية وتركيز بحث العملاء. لا يتم إرسال أو نشر أي إجراء خارجي من هذه اللوحة.`,
    recommendations: [
      "سجّل مؤشرات أمس اليدوية قبل إنشاء مسودات جديدة.",
      product
        ? `استخدم سياق ${product.name} فقط: ${product.contentAngles.slice(0, 2).join(", ")}.`
        : "في العمل العام، ابقَ على مستوى Smart Art AI Solutions وتجنب ادعاءات خاصة بمنتج.",
      "أبقِ كل المنشورات والرسائل في مراجعة المالك حتى تتم الموافقة صراحة.",
      "استخدم fit_score >= 85 كحد جودة للعميل، وليس كضمان للبيع."
    ]
  };
}

export function buildPostDraft(product: ProductSeed) {
  return {
    topic: product.contentAngles[0],
    facebook:
      `${product.positioning} يجب تقديم ${product.name} عبر ${product.contentAngles
        .slice(0, 2)
        .join(" و")} إلى ${product.audience}. أبقِ الرسالة هادئة ومحددة ومبنية فقط على سياق هذا المنتج.`,
    instagram:
      `${product.contentAngles[0]} إلى ${product.audience}. يحافظ ${product.name} على الرسالة مركزة على المنتج المحدد بدون ادعاءات عابرة بين المنتجات.`,
    cta: product.cta,
    imagePrompt:
      `Premium Scandinavian B2B product visual for ${product.name}. Show ${product.contentAngles
        .slice(0, 3)
        .join(", ")} in a realistic business context. Keep all details scoped to this selected product.`
  };
}

export function buildLeadResearchBrief(product: ProductSeed) {
  const criteria = product.leadCriteria.map((item, index) => `${index + 1}. ${item}`).join("\n");

  return `ابحث عن 20 شركة سويدية مناسبة لـ ${product.name}.

المخرجات المطلوبة لكل عميل:
- company_name
- website
- city
- sector
- source_url
- fit_reason
- website_analysis_summary
- best_entry_angle_for_email
- official_email
- official_email_source_url
- official_email_source_page
- contact_confidence
- fit_score

معايير القبول:
${criteria}

حدود سياق المنتج:
- المنتج المحدد: ${product.name}
- نوع المنتج: ${product.productType}
- الجمهور: ${product.audience}
- التموضع: ${product.positioning}
- نقاط الألم: ${product.painPoints.join("; ")}
- المزايا: ${product.features.join("; ")}
- النبرة المفضلة: ${product.preferredTone.join(", ")}
- حدود الرسائل: لا تستعِر ادعاءات أو لغة جمهور أو لغة مزايا أو أمثلة من منتج آخر من Smart Art AI Solutions.

التقييم:
- ملاءمة المنتج: 0-25
- الحاجة الظاهرة: 0-25
- صلة السوق: 0-20
- ثقة جهة الاتصال: 0-15
- التوقيت والفرصة: 0-15

القواعد:
- حمّل واستخدم سياق المنتج المحدد أعلاه فقط.
- ارفض خلط سياقات المنتجات.
- إذا لم يتم اختيار منتج، أنشئ محتوى عامًا فقط على مستوى Smart Art AI Solutions ولا تنشئ توصيات عملاء خاصة بمنتج.
- احتفظ فقط بالعملاء الذين لديهم fit_score >= 85.
- fit_score ليس ضمانًا للتحويل.
- لا تخمّن عناوين البريد.
- ارفض العملاء عندما لا يمكن التحقق من البريد على صفحة شركة رسمية.
- زاوية التواصل يجب أن تكون محترمة ومبنية على فرصة.`;
}
