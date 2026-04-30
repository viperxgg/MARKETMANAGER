export function statusAr(value?: string | null) {
  const statuses: Record<string, string> = {
    draft: "مسودة",
    strategy_ready: "جاهز للاستراتيجية",
    leads_ready: "العملاء جاهزون",
    drafts_ready: "المسودات جاهزة",
    compliance_review: "مراجعة الالتزام",
    needs_revision: "يحتاج تعديل",
    owner_review: "بانتظار مراجعة المالك",
    approved_by_owner: "معتمد من المالك",
    manually_executed: "نُفّذ يدويًا",
    tracking: "قيد المتابعة",
    completed: "مكتمل",
    published: "منشور",
    failed: "فشل",
    sent_manually: "أُرسل يدويًا",
    replied: "تم الرد",
    responded: "تم الرد",
    follow_up_needed: "يحتاج متابعة",
    closed: "مغلق",
    rejected: "مرفوض",
    reviewed: "تمت المراجعة",
    cancelled: "ملغى",
    discovered: "مكتشف",
    analyzed: "تم التحليل",
    contact_verified: "تم التحقق من جهة الاتصال",
    qualified: "مؤهل",
    outreach_drafted: "تم إنشاء مسودة تواصل",
    approved_for_contact: "موافق عليه للتواصل اليدوي",
    contacted_manually: "تم التواصل يدويًا",
    converted: "تحوّل إلى عميل",
    not_relevant: "غير مناسب"
  };

  return value ? statuses[value] ?? value : "";
}

export function channelAr(value?: string | null) {
  const channels: Record<string, string> = {
    facebook: "فيسبوك",
    instagram: "إنستغرام",
    linkedin: "لينكدإن",
    email: "بريد إلكتروني",
    manual: "يدوي",
    codex_research: "بحث Codex"
  };

  return value ? channels[value] ?? value : "";
}

export function scopeAr(value: string) {
  if (value === "All products") {
    return "كل المنتجات";
  }

  if (value === "Global") {
    return "عام";
  }

  return value;
}

export function duplicateRiskAr(value?: string | null) {
  const risks: Record<string, string> = {
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع"
  };

  return value ? risks[value] ?? value : "";
}
