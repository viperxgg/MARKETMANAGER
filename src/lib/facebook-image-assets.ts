import { prisma } from "./db";
import { getOpenAiImageConfig } from "./openai-config";
import { getProduct } from "./product-data";
import {
  FacebookImageAssetOutput,
  facebookImageAssetOutputSchema
} from "./validation";

const forbiddenTermsByProduct: Record<string, string[]> = {
  "nord-smart-menu": ["cleaning", "rut", "städ", "cleaning worker", "cleaning checklist"],
  "stadsync-ai": ["qr menu", "restaurant", "waiter", "kitchen", "alcohol", "food ordering"]
};

function imageSizeForModel(model: string) {
  return model.toLowerCase().includes("dall-e-3") ? "1792x1024" : "1536x1024";
}

function assertImageBoundary(output: FacebookImageAssetOutput) {
  const text = JSON.stringify(output).toLowerCase();
  const blocked = forbiddenTermsByProduct[output.productSlug].filter((term) =>
    text.includes(term.toLowerCase())
  );

  if (blocked.length > 0) {
    throw new Error(`Product context leakage detected in image asset: ${blocked.join(", ")}`);
  }
}

function buildImagePrompt(input: {
  productName: string;
  productPositioning: string;
  postText: string;
  imageConcept: string;
  imagePrompt: string;
}) {
  return [
    input.imagePrompt,
    "",
    "Create a Facebook landscape social image for Smart Art AI Solutions.",
    "Preferred composition: premium, modern, clean, Scandinavian, trustworthy, professional B2B.",
    "Use the post context and visual concept without adding too much text inside the image.",
    `Product: ${input.productName}.`,
    `Positioning: ${input.productPositioning}.`,
    `Image concept: ${input.imageConcept}.`,
    `Post text context: ${input.postText.slice(0, 900)}.`,
    "Avoid fake logos, fake customer testimonials, official badges, unverifiable claims, misleading compliance claims, and cluttered text."
  ].join("\n");
}

export async function generateFacebookImageAsset(input: {
  socialPostDraftId: string;
}): Promise<FacebookImageAssetOutput> {
  const { apiKey, imageModel } = getOpenAiImageConfig();

  const draft = await prisma.socialPostDraft.findUnique({
    where: { id: input.socialPostDraftId },
    include: { product: true, assets: true }
  });

  if (!draft || draft.platform !== "facebook") {
    throw new Error("FACEBOOK_DRAFT_NOT_FOUND");
  }

  const product = getProduct(draft.product.slug);

  if (!product) {
    throw new Error("PRODUCT_CONTEXT_NOT_FOUND");
  }

  const imagePrompt = buildImagePrompt({
    productName: product.name,
    productPositioning: product.positioning,
    postText: draft.body,
    imageConcept: draft.imageConcept,
    imagePrompt: draft.imagePromptEn
  });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: imageModel,
      prompt: imagePrompt,
      size: imageSizeForModel(imageModel),
      n: 1
    })
  });

  if (!response.ok) {
    throw new Error("OPENAI_IMAGE_GENERATION_FAILED");
  }

  const payload = await response.json();
  const image = payload?.data?.[0];
  const imageUrl = typeof image?.url === "string" ? image.url : null;
  const storedImageReference =
    imageUrl ?? (typeof image?.b64_json === "string" ? `data:image/png;base64,${image.b64_json}` : null);

  if (!imageUrl && !storedImageReference) {
    throw new Error("OPENAI_IMAGE_GENERATION_EMPTY");
  }

  const output = facebookImageAssetOutputSchema.parse({
    socialPostDraftId: draft.id,
    productSlug: product.slug,
    platform: "facebook",
    imagePrompt,
    imageModel,
    imageUrl,
    storedImageReference,
    status: "draft",
    requiresApproval: true,
    warnings: [
      "لا يوجد نشر تلقائي.",
      "موافقة المالك مطلوبة.",
      "الصورة محفوظة كأصل مسودة مرتبط بمنشور فيسبوك."
    ]
  });

  assertImageBoundary(output);

  const asset = await prisma.socialPostAsset.create({
    data: {
      productId: draft.productId,
      socialPostDraftId: draft.id,
      platform: "facebook",
      assetType: "image",
      imagePrompt: output.imagePrompt,
      imageModel: output.imageModel,
      imageUrl: output.imageUrl,
      storedImageReference: output.storedImageReference,
      warnings: output.warnings,
      status: "draft",
      approved_by_owner: false,
      manual_execution_required: true,
      requiresApproval: true,
      notes: `facebook_image_asset:${draft.id}`
    }
  });

  await prisma.approvalItem.create({
    data: {
      productId: draft.productId,
      itemType: "facebook_image_asset",
      itemId: asset.id,
      contentPreview: `صورة فيسبوك مسودة لـ ${product.name}: ${draft.campaignAngle}`,
      riskWarnings: [
        "لا يوجد نشر تلقائي",
        "موافقة المالك مطلوبة",
        "لا شعارات وهمية أو ادعاءات رسمية غير قابلة للتحقق"
      ],
      complianceChecklist: [
        "تم تحميل سياق المنتج",
        "تم استخدام مسودة المنشور الموجودة",
        "تم حفظ الصورة كأصل مسودة",
        "approved_by_owner ما زال false"
      ],
      finalStatus: "manual_execution_required",
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `facebook_image_asset:${draft.id}`
    }
  });

  return output;
}
