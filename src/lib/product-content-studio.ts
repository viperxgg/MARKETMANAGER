import { prisma } from "./db";
import { ensureProductRecord } from "./data-service";
import { getProduct, ProductSlug } from "./product-data";
import {
  FacebookContentStudioOutput,
  facebookContentStudioOutputSchema
} from "./validation";

const forbiddenTermsByProduct: Record<ProductSlug, string[]> = {
  "nord-smart-menu": ["cleaning", "städ", "stadfirma", "rut", "worker checklist", "cleaning checklist"],
  "stadsync-ai": ["qr menu", "qr-meny", "restaurant", "restaurang", "waiter", "kitchen flow", "alcohol", "food ordering"]
};

function safeText(value: unknown, max = 280) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Content Studio response did not contain a JSON object.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function assertNoProductLeakage(output: FacebookContentStudioOutput) {
  const terms = forbiddenTermsByProduct[output.productSlug];
  const text = JSON.stringify({
    postText: output.postText,
    strategicReason: output.strategicReason,
    targetAudience: output.targetAudience,
    contentAngle: output.contentAngle,
    similarityNotes: output.similarityNotes,
    imageConcept: output.imageConcept,
    imagePrompt: output.imagePrompt
  }).toLowerCase();
  const hits = terms.filter((term) => text.includes(term));

  if (hits.length > 0) {
    throw new Error(`Product context leakage detected: ${hits.join(", ")}`);
  }
}

async function loadStudioContext(productSlug: ProductSlug) {
  const product = getProduct(productSlug);

  if (!product) {
    throw new Error("Unknown product.");
  }

  const productRecord = await ensureProductRecord(productSlug);

  if (!productRecord) {
    throw new Error("Product record not available.");
  }

  const [recentPosts, approvals, memories] = await Promise.all([
    prisma.socialPostDraft.findMany({
      where: {
        productId: productRecord.id,
        platform: "facebook"
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.approvalItem.findMany({
      where: {
        productId: productRecord.id
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.agencyMemory.findMany({
      where: {
        productId: productRecord.id
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return {
    product,
    productRecord,
    recentPosts: recentPosts.map((post) => ({
      hook: post.hook,
      angle: post.campaignAngle,
      body: safeText(post.body),
      notes: safeText(post.notes)
    })),
    approvals: approvals.map((item) => ({
      type: item.itemType,
      status: item.status,
      preview: safeText(item.contentPreview)
    })),
    memories: memories.map((memory) => ({
      title: memory.title,
      insight: safeText(memory.insight),
      recommendation: safeText(memory.recommendation),
      confidence: memory.confidence
    }))
  };
}

function buildPrompt(context: Awaited<ReturnType<typeof loadStudioContext>>) {
  const { product } = context;

  return [
    "You are the product-specific Content Studio for Smart Art AI Solutions.",
    "Generate exactly one Swedish Facebook post draft and one image prompt.",
    "Never publish, send, contact customers, or approve the draft.",
    "Return JSON only.",
    "",
    "Selected product context:",
    `Product: ${product.name}`,
    `Product type: ${product.productType}`,
    `Audience: ${product.audience}`,
    `Positioning: ${product.positioning}`,
    `Pain points: ${product.painPoints.join("; ")}`,
    `Features: ${product.features.join("; ")}`,
    `Tone: ${product.preferredTone.join(", ")}`,
    `Allowed content angles: ${product.contentAngles.join("; ")}`,
    "Boundary: use only this selected product context. Do not borrow another Smart Art AI Solutions product context.",
    "",
    "Duplicate prevention context:",
    JSON.stringify(
      {
        recentFacebookPosts: context.recentPosts,
        recentApprovals: context.approvals,
        memoryNotes: context.memories
      },
      null,
      2
    ),
    "",
    "Return this exact JSON shape:",
    JSON.stringify({
      productSlug: product.slug,
      platform: "facebook",
      language: "sv",
      postText: "Swedish Facebook post text",
      strategicReason: "Why this post is useful now",
      targetAudience: product.audience,
      contentAngle: product.contentAngles[0],
      duplicateRisk: "low | medium | high",
      similarityNotes: "How this compares to recent posts and approvals",
      imageConcept: "Short visual concept",
      imagePrompt: "English image generation prompt",
      imageUrl: null,
      requiresApproval: true,
      warnings: ["لا يوجد نشر تلقائي"]
    })
  ].join("\n");
}

async function callOpenAiForFacebookPost(context: Awaited<ReturnType<typeof loadStudioContext>>) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You write careful Swedish B2B marketing drafts. Return JSON only. Never suggest publishing or contacting customers automatically."
        },
        {
          role: "user",
          content: buildPrompt(context)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.35
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI text generation failed.");
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include content.");
  }

  return facebookContentStudioOutputSchema.parse(parseJsonObject(content));
}

async function maybeGenerateImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_GENERATION_MODEL;

  if (!apiKey || !model) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      n: 1
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const image = payload?.data?.[0];

  if (typeof image?.url === "string") {
    return image.url;
  }

  if (typeof image?.b64_json === "string") {
    return `data:image/png;base64,${image.b64_json}`;
  }

  return null;
}

function fallbackOutput(context: Awaited<ReturnType<typeof loadStudioContext>>): FacebookContentStudioOutput {
  const { product, recentPosts } = context;
  const duplicateRisk = recentPosts.length > 0 ? "medium" : "low";
  const angle = product.contentAngles[0];
  const isNord = product.slug === "nord-smart-menu";

  return facebookContentStudioOutputSchema.parse({
    productSlug: product.slug,
    platform: "facebook",
    language: "sv",
    postText: isNord
      ? `En tydligare gästupplevelse börjar ofta med det första steget: att snabbt kunna öppna, förstå och välja från menyn. ${product.name} hjälper verksamheter att presentera menyn digitalt, hålla innehållet uppdaterat och skapa ett lugnare flöde mellan gäst och personal.\n\nVill du se hur ett sådant flöde kan se ut i praktiken?`
      : `När bokningar, instruktioner och uppföljning hamnar på flera ställen blir vardagen lätt svår att hålla konsekvent. ${product.name} hjälper städföretag att samla arbetsflöden, tydliggöra uppgifter och skapa bättre överblick i det dagliga arbetet.\n\nVill du se hur ett mer strukturerat arbetssätt kan se ut?`,
    strategicReason:
      "OPENAI_API_KEY غير مضبوط، لذلك تستخدم هذه المسودة المحلية الآمنة سياق المنتج المختار والسجل الحديث بدون استدعاء النموذج.",
    targetAudience: product.audience,
    contentAngle: angle,
    duplicateRisk,
    similarityNotes:
      recentPosts.length > 0
        ? "توجد مسودات فيسبوك حديثة لهذا المنتج، لذلك راجع تداخل الزاوية قبل الموافقة."
        : "لا توجد مسودات فيسبوك حديثة لهذا المنتج.",
    imageConcept: isNord
      ? "Premium hospitality service scene with a phone-based digital product interface."
      : "Premium operations dashboard and field-team workflow scene for a service company.",
    imagePrompt: isNord
      ? "Premium Scandinavian hospitality setting, phone showing a refined digital product interface, calm staff workflow, elegant dark UI accents, realistic lighting, no fake logos, no exaggerated claims."
      : "Premium Scandinavian cleaning operations setting, tablet dashboard with task overview and quality follow-up, calm professional service context, elegant dark UI accents, no fake logos, no exaggerated claims.",
    imageUrl: null,
    requiresApproval: true,
    warnings: [
      "OPENAI_API_KEY غير موجود. تم إنشاء مسودة محلية آمنة.",
      "لم يحدث أي نشر على فيسبوك."
    ]
  });
}

export async function generateFacebookPostForProduct(productSlug: ProductSlug) {
  const context = await loadStudioContext(productSlug);
  let output: FacebookContentStudioOutput;

  try {
    output = await callOpenAiForFacebookPost(context);
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_API_KEY is not configured.") {
      output = fallbackOutput(context);
    } else {
      throw error;
    }
  }

  output = facebookContentStudioOutputSchema.parse({
    ...output,
    productSlug,
    platform: "facebook",
    language: "sv",
    requiresApproval: true
  });
  assertNoProductLeakage(output);

  const imageUrl = await maybeGenerateImage(output.imagePrompt);
  const finalOutput = facebookContentStudioOutputSchema.parse({
    ...output,
    imageUrl,
    warnings: imageUrl
      ? output.warnings
      : [...output.warnings, "توليد الصور غير مضبوط أو لم يرجع صورة."]
  });

  const draft = await prisma.socialPostDraft.create({
    data: {
      productId: context.productRecord.id,
      platform: "facebook",
      campaignAngle: finalOutput.contentAngle,
      audience: finalOutput.targetAudience,
      postType: "content_studio",
      hook: finalOutput.contentAngle,
      body: finalOutput.postText,
      cta: "مراجعة المالك مطلوبة",
      hashtags: context.product.socialHashtags,
      imageConcept: finalOutput.imageConcept,
      imagePromptEn: finalOutput.imagePrompt,
      visualAvoid: ["unsupported claims", "fake customer logos", "cross-product messaging"],
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `content_studio:${JSON.stringify(finalOutput)}`
    }
  });

  await prisma.approvalItem.create({
    data: {
      productId: context.productRecord.id,
      itemType: "content_studio_facebook_post",
      itemId: draft.id,
      contentPreview: `مسودة فيسبوك لـ ${context.product.name}: ${finalOutput.contentAngle}`,
      riskWarnings: [
        `duplicate_risk: ${finalOutput.duplicateRisk}`,
        "لا يوجد نشر تلقائي على فيسبوك",
        "موافقة المالك مطلوبة"
      ],
      complianceChecklist: [
        "تم تحميل سياق المنتج المختار",
        "تم التحقق من JSON عبر Zod",
        "تم فحص تسرب سياق المنتجات",
        "الموافقة اليدوية مطلوبة"
      ],
      finalStatus: "manual_execution_required",
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: finalOutput.similarityNotes
    }
  });

  return { draftId: draft.id, output: finalOutput };
}

export function parseContentStudioNotes(notes?: string | null) {
  if (!notes?.startsWith("content_studio:")) {
    return null;
  }

  try {
    return facebookContentStudioOutputSchema.parse(JSON.parse(notes.slice("content_studio:".length)));
  } catch {
    return null;
  }
}
