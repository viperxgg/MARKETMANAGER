import { prisma } from "./db";
import { ensureProductRecord } from "./data-service";
import { getProduct, ProductSlug } from "./product-data";
import {
  FacebookContentStudioOutput,
  facebookContentStudioOutputSchema,
  productSlugSchema
} from "./validation";

const notesPrefix = "content_studio:";

const forbiddenTermsByProduct: Record<ProductSlug, string[]> = {
  "nord-smart-menu": [
    "cleaning",
    "cleaning company",
    "cleaning companies",
    "cleaning operations",
    "rut",
    "städ",
    "städning",
    "städfirma",
    "städteam",
    "worker checklist",
    "workers",
    "checklists"
  ],
  "stadsync-ai": [
    "qr menu",
    "qr-meny",
    "digital menu",
    "restaurant",
    "restaurants",
    "restaurang",
    "waiter",
    "waiters",
    "kitchen flow",
    "kitchen",
    "alcohol",
    "food ordering",
    "menu ordering",
    "mobile ordering"
  ]
};

function safeText(value: unknown, max = 400) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function assertProductSeparation(output: FacebookContentStudioOutput) {
  const text = JSON.stringify(output).toLowerCase();
  const blocked = forbiddenTermsByProduct[output.productSlug].filter((term) =>
    text.includes(term.toLowerCase())
  );

  if (blocked.length > 0) {
    throw new Error(`Product context leakage detected: ${blocked.join(", ")}`);
  }
}

function buildPrompt(context: Awaited<ReturnType<typeof loadContentStudioContext>>) {
  const { product } = context;

  return [
    "You are the product-specific Content Studio for Smart Art AI Solutions.",
    "You draft only. Never publish, send, contact customers, approve execution, or imply external action happened.",
    "Return JSON only.",
    "",
    "Selected product context:",
    `Product slug: ${product.slug}`,
    `Product name: ${product.name}`,
    `Product type: ${product.productType}`,
    `Audience: ${product.audience}`,
    `Positioning: ${product.positioning}`,
    `Pain points: ${product.painPoints.join("; ")}`,
    `Features: ${product.features.join("; ")}`,
    `Preferred tone: ${product.preferredTone.join(", ")}`,
    `Allowed content angles: ${product.contentAngles.join("; ")}`,
    `Forbidden messaging: ${product.forbiddenMessaging.join("; ")}`,
    `Forbidden product topics: ${forbiddenTermsByProduct[product.slug].join("; ")}`,
    "",
    "Recent product-specific history for duplicate prevention:",
    JSON.stringify(context.duplicateSignals, null, 2),
    "",
    "Task:",
    "Generate one new Swedish Facebook post for this selected product only.",
    "Review the history and avoid repeating the same angle unless the recommended action is clearly a revision.",
    "The image prompt should be in English and suitable for a premium B2B social image.",
    "Do not mention forbidden topics anywhere in the output.",
    "",
    "Return only valid JSON with this exact shape:",
    JSON.stringify({
      productSlug: product.slug,
      platform: "facebook",
      language: "sv",
      postText: "Swedish Facebook post text",
      strategicReason: "why this post should be used now",
      targetAudience: "specific audience segment",
      contentAngle: "specific content angle",
      duplicateRisk: "low | medium | high",
      similarityNotes: "short comparison with previous drafts and approvals",
      imageConcept: "short visual concept",
      imagePrompt: "English image generation prompt",
      imageUrl: null,
      requiresApproval: true,
      warnings: ["لا يوجد نشر تلقائي. موافقة المالك مطلوبة."]
    })
  ].join("\n");
}

async function loadContentStudioContext(productSlug: ProductSlug) {
  const product = getProduct(productSlug);

  if (!product) {
    throw new Error("Unknown product.");
  }

  const productRecord = await ensureProductRecord(productSlug);

  if (!productRecord) {
    throw new Error("Product record not available.");
  }

  const [socialDrafts, approvalItems, memories] = await Promise.all([
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
      take: 12
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
    duplicateSignals: {
      socialDrafts: socialDrafts.map((draft) => ({
        createdAt: draft.createdAt.toISOString(),
        hook: draft.hook,
        angle: draft.campaignAngle,
        body: safeText(draft.body),
        imageConcept: safeText(draft.imageConcept)
      })),
      approvalItems: approvalItems.map((item) => ({
        createdAt: item.createdAt.toISOString(),
        type: item.itemType,
        status: item.status,
        preview: safeText(item.contentPreview),
        warnings: item.riskWarnings.slice(0, 4)
      })),
      memories: memories.map((memory) => ({
        title: memory.title,
        confidence: memory.confidence,
        insight: safeText(memory.insight),
        recommendation: safeText(memory.recommendation)
      }))
    }
  };
}

async function callOpenAiForFacebookPost(
  context: Awaited<ReturnType<typeof loadContentStudioContext>>
) {
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
            "You are a careful Swedish B2B marketing assistant. Return JSON only. Never publish, send, contact customers, or approve execution."
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

function fallbackFacebookPost(
  context: Awaited<ReturnType<typeof loadContentStudioContext>>
): FacebookContentStudioOutput {
  const duplicateRisk = context.duplicateSignals.socialDrafts.length > 0 ? "medium" : "low";

  if (context.product.slug === "nord-smart-menu") {
    return facebookContentStudioOutputSchema.parse({
      productSlug: "nord-smart-menu",
      platform: "facebook",
      language: "sv",
      postText:
        "En tydlig digital meny gör serviceflödet lugnare. Med Nord Smart Menu kan gästen se rätter, bilder och val direkt i mobilen, samtidigt som personalen behåller kontrollen över presentation, beställningsflöde och nästa steg. För restauranger som vill skapa en smidigare gästupplevelse utan att tappa den personliga känslan.",
      strategicReason:
        "Det här inlägget lyfter produktens kärnvärde utan att lova resultat eller blanda in andra Smart Art AI Solutions-produkter.",
      targetAudience: context.product.audience,
      contentAngle: "QR menu clarity for guests",
      duplicateRisk,
      similarityNotes:
        "تمت مراجعة المسودات والموافقات والذاكرة الحديثة لهذا المنتج محليًا. أضف OPENAI_API_KEY لتفعيل مراجعة تشابه أعمق عبر النموذج.",
      imageConcept:
        "A calm restaurant table scene where a guest views a clean digital menu on a phone while staff service continues in the background.",
      imagePrompt:
        "Premium Scandinavian restaurant interior, guest viewing a polished digital menu on a smartphone, subtle staff service in background, warm natural light, clean B2B product marketing style, no logos, no exaggerated claims",
      imageUrl: null,
      requiresApproval: true,
      warnings: [
        "OPENAI_API_KEY غير موجود. تم إنشاء مسودة محلية آمنة بدل استدعاء النموذج.",
        "لا يوجد نشر تلقائي. موافقة المالك مطلوبة."
      ]
    });
  }

  return facebookContentStudioOutputSchema.parse({
    productSlug: "stadsync-ai",
    platform: "facebook",
    language: "sv",
    postText:
      "När bokningar, kundinstruktioner och arbetsuppgifter ligger utspridda blir varje dag svårare att följa upp. StädSync AI hjälper städföretag att samla arbetsflödet: tydligare uppgifter för teamet, digitala checklistor, bättre kundkommunikation och struktur för RUT-relaterade moment med mänsklig kontroll. Mindre friktion i vardagen. Mer konsekvent kvalitet.",
    strategicReason:
      "Inlägget fokuserar på operativ tydlighet för svenska städföretag och undviker alla ämnen som hör till andra produktkontexter.",
    targetAudience: context.product.audience,
    contentAngle: "Worker task management and digital checklists",
    duplicateRisk,
    similarityNotes:
      "تمت مراجعة المسودات والموافقات والذاكرة الحديثة لهذا المنتج محليًا. أضف OPENAI_API_KEY لتفعيل مراجعة تشابه أعمق عبر النموذج.",
    imageConcept:
      "A cleaning operations manager reviewing structured tasks and quality follow-up on a tablet beside neatly organized field work supplies.",
    imagePrompt:
      "Premium Scandinavian B2B operations image for a Swedish cleaning company, operations manager reviewing worker tasks and digital checklists on a tablet, organized cleaning supplies, bright professional office and field-service feel, no logos, no exaggerated claims",
    imageUrl: null,
    requiresApproval: true,
    warnings: [
      "OPENAI_API_KEY غير موجود. تم إنشاء مسودة محلية آمنة بدل استدعاء النموذج.",
      "لا يوجد نشر تلقائي. موافقة المالك مطلوبة."
    ]
  });
}

export function parseContentStudioNotes(notes: string) {
  if (!notes.startsWith(notesPrefix)) {
    return null;
  }

  try {
    return facebookContentStudioOutputSchema.parse(
      JSON.parse(notes.slice(notesPrefix.length))
    );
  } catch {
    return null;
  }
}

export async function generateFacebookPostForProduct(input: { productSlug: ProductSlug }) {
  const productSlug = productSlugSchema.parse(input.productSlug);
  const context = await loadContentStudioContext(productSlug);
  let output: FacebookContentStudioOutput;

  try {
    output = await callOpenAiForFacebookPost(context);
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_API_KEY is not configured.") {
      output = fallbackFacebookPost(context);
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

  assertProductSeparation(output);

  const draft = await prisma.socialPostDraft.create({
    data: {
      productId: context.productRecord.id,
      platform: "facebook",
      campaignAngle: output.contentAngle,
      audience: output.targetAudience,
      postType: "content_studio",
      hook: output.contentAngle,
      body: output.postText,
      cta: context.product.cta,
      hashtags: context.product.socialHashtags,
      imageConcept: output.imageConcept,
      imagePromptEn: output.imagePrompt,
      visualAvoid: [
        ...context.product.prohibitedClaims,
        ...context.product.forbiddenMessaging,
        ...forbiddenTermsByProduct[productSlug]
      ],
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `${notesPrefix}${JSON.stringify(output)}`
    }
  });

  const approval = await prisma.approvalItem.create({
    data: {
      productId: context.productRecord.id,
      itemType: "content_studio_facebook_post",
      itemId: draft.id,
      contentPreview: `مسودة فيسبوك لـ ${context.product.name}: ${output.contentAngle} (خطر التكرار: ${output.duplicateRisk})`,
      riskWarnings: [
        `duplicate_risk: ${output.duplicateRisk}`,
        output.similarityNotes,
        "لا يوجد نشر تلقائي",
        "موافقة المالك مطلوبة"
      ],
      complianceChecklist: [
        "تم تحميل سياق المنتج المختار",
        "تمت مراجعة المسودات الاجتماعية والموافقات والذاكرة السابقة",
        "تم التحقق من الخرج المنظم عبر Zod",
        "تم اجتياز فحص فصل المنتجات",
        "approved_by_owner ما زال false"
      ],
      finalStatus: "manual_execution_required",
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `${notesPrefix}${draft.id}`
    }
  });

  return {
    draftId: draft.id,
    approvalId: approval.id,
    output
  };
}
