import { z } from "zod";
import { prisma } from "./db";
import { ensureProductRecord } from "./data-service";
import { completeJsonViaDispatch } from "./integrations/openai/helpers";
import { getOpenAiTextConfig, isOpenAiTextConfigured } from "./openai-config";
import { getProduct, ProductSlug } from "./product-data";
import { productSlugSchema } from "./validation";

const csvRowSchema = z.object({
  companyName: z.string().min(2).max(180),
  website: z.string().url(),
  officialEmail: z.string().email(),
  businessType: z.string().min(2).max(160),
  city: z.string().min(2).max(120),
  notes: z.string().max(1000).default("")
});

const scoredCsvLeadSchema = csvRowSchema.extend({
  productSlug: productSlugSchema,
  fitScore: z.coerce.number().int().min(0).max(100),
  acceptanceLikelihood: z.coerce.number().int().min(0).max(100),
  companySizeEstimate: z.string().min(2).max(160),
  reasonForSelection: z.string().min(10).max(1200),
  whyTheyMightPay: z.string().min(10).max(1000),
  visiblePainPoints: z.array(z.string().min(2).max(300)).min(1).max(8),
  personalizationNotes: z.string().min(10).max(1000),
  proposedEmailSubject: z.string().min(2).max(180),
  proposedEmailBody: z.string().min(20).max(3000),
  duplicateRisk: z.enum(["low", "medium", "high"]),
  contactStatus: z.string().min(2).max(120),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

const scoredCsvOutputSchema = z.object({
  productSlug: productSlugSchema,
  summary: z.string().min(5).max(1500),
  outreachLearning: z.string().min(5).max(1500),
  leads: z.array(scoredCsvLeadSchema).max(50),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

type CsvRow = z.infer<typeof csvRowSchema>;
type ScoredCsvLead = z.infer<typeof scoredCsvLeadSchema>;

type RejectedCsvRow = {
  rowNumber: number;
  companyName: string;
  reason: string;
};

const forbiddenTermsByProduct: Record<ProductSlug, string[]> = {
  "nord-smart-menu": [
    "cleaning",
    "cleaning company",
    "cleaning companies",
    "cleaning operations",
    "rut",
    "stadfirma",
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

function safeText(value: unknown, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function rootDomain(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    const parts = host.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : host;
  } catch {
    return "";
  }
}

function normalizeCompanyName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9a-z]/gi, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function csvToObjects(text: string) {
  const rows = parseCsv(text);
  const [headers, ...body] = rows;
  const required = ["companyName", "website", "officialEmail", "businessType", "city", "notes"];

  if (!headers) {
    return {
      rows: [],
      rejected: [{ rowNumber: 1, companyName: "", reason: "CSV file is empty." }] as RejectedCsvRow[]
    };
  }

  const missingHeaders = required.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      rejected: [
        {
          rowNumber: 1,
          companyName: "",
          reason: `Missing required columns: ${missingHeaders.join(", ")}.`
        }
      ] as RejectedCsvRow[]
    };
  }

  const accepted: Array<CsvRow & { rowNumber: number }> = [];
  const rejected: RejectedCsvRow[] = [];

  body.forEach((values, index) => {
    const object = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const parsed = csvRowSchema.safeParse(object);
    const rowNumber = index + 2;

    if (!parsed.success) {
      rejected.push({
        rowNumber,
        companyName: String(object.companyName ?? ""),
        reason: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
      });
      return;
    }

    accepted.push({
      ...parsed.data,
      rowNumber
    });
  });

  return { rows: accepted, rejected };
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

function assertProductSeparation(output: z.infer<typeof scoredCsvOutputSchema>) {
  const text = JSON.stringify(output).toLowerCase();
  const blocked = forbiddenTermsByProduct[output.productSlug].filter((term) =>
    text.includes(term.toLowerCase())
  );

  if (blocked.length > 0) {
    throw new Error(`Product context leakage detected: ${blocked.join(", ")}`);
  }
}

async function loadCsvContext(productSlug: ProductSlug) {
  const product = getProduct(productSlug);

  if (!product) {
    throw new Error("Unknown product.");
  }

  const productRecord = await ensureProductRecord(productSlug);

  if (!productRecord) {
    throw new Error("Product record not available.");
  }

  const [leads, outreachDrafts, memories] = await Promise.all([
    prisma.lead.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.outreachDraft.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 40
    }),
    prisma.agencyMemory.findMany({
      where: { productId: productRecord.id },
      orderBy: { updatedAt: "desc" },
      take: 12
    })
  ]);

  return {
    product,
    productRecord,
    existing: {
      leads: leads.map((lead) => ({
        companyName: lead.companyName,
        domain: rootDomain(lead.website),
        email: lead.officialEmail?.toLowerCase(),
        status: lead.status,
        contacted: Boolean(lead.lastContactedAt || lead.status === "contacted_manually")
      })),
      outreachDrafts: outreachDrafts.map((draft) => ({
        company: draft.company,
        subject: draft.subject,
        status: draft.status,
        bodyPreview: safeText(draft.bodyPreview),
        notes: safeText(draft.notes)
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

function buildPrompt(context: Awaited<ReturnType<typeof loadCsvContext>>, rows: Array<CsvRow & { rowNumber: number }>) {
  const { product } = context;

  return [
    "You are Agency Brain scoring owner-provided CSV leads for Smart Art AI Solutions.",
    "The CSV rows are the only source of companies. Do not invent companies, websites, or emails.",
    "You never send emails, contact companies, approve outreach, or imply an external action happened.",
    "Return JSON only.",
    "",
    "Selected product context:",
    `Product slug: ${product.slug}`,
    `Name: ${product.name}`,
    `Product type: ${product.productType}`,
    `Audience: ${product.audience}`,
    `Positioning: ${product.positioning}`,
    `Pain points: ${product.painPoints.join("; ")}`,
    `Features: ${product.features.join("; ")}`,
    `Preferred tone: ${product.preferredTone.join(", ")}`,
    `Lead criteria: ${product.leadCriteria.join("; ")}`,
    `Allowed angles: ${product.contentAngles.join("; ")}`,
    `Forbidden topics: ${forbiddenTermsByProduct[product.slug].join("; ")}`,
    "",
    "Previous leads, outreach, and memory:",
    JSON.stringify(context.existing, null, 2),
    "",
    "CSV rows to score:",
    JSON.stringify(rows, null, 2),
    "",
    "Rules:",
    "- Only keep rows with fitScore >= 80.",
    "- Mark duplicateRisk high for matching company, domain, or email.",
    "- If duplicateRisk is high, the app may skip saving it.",
    "- Proposed email must be Swedish, calm, respectful, personalized, and product-specific.",
    "- Never criticize, shame, or imply the company is weak, outdated, bad, or failing.",
    "- If information is missing from CSV, say it is missing; do not fake it.",
    "",
    "Return only valid JSON with this exact shape:",
    JSON.stringify({
      productSlug: product.slug,
      summary: "string",
      outreachLearning: "string",
      leads: [
        {
          companyName: "string",
          website: "https://example.se",
          officialEmail: "info@example.se",
          businessType: "string",
          city: "string",
          notes: "string",
          productSlug: product.slug,
          fitScore: 80,
          acceptanceLikelihood: 50,
          companySizeEstimate: "small or medium with short reasoning",
          reasonForSelection: "string",
          whyTheyMightPay: "string",
          visiblePainPoints: ["string"],
          personalizationNotes: "string",
          proposedEmailSubject: "string",
          proposedEmailBody: "string",
          duplicateRisk: "low | medium | high",
          contactStatus: "not_contacted",
          warnings: ["string"]
        }
      ],
      warnings: ["string"]
    })
  ].join("\n");
}

async function callOpenAiForCsvLeads(
  context: Awaited<ReturnType<typeof loadCsvContext>>,
  rows: Array<CsvRow & { rowNumber: number }>
) {
  // Asserts text config is present and surfaces openAiTextConfigurationError if not.
  getOpenAiTextConfig();

  const text = await completeJsonViaDispatch({
    system:
      "You are a careful Swedish B2B lead scorer. Return JSON only. Never invent companies or emails. Never send outreach.",
    user: buildPrompt(context, rows),
    temperature: 0.2
  });

  return scoredCsvOutputSchema.parse(parseJsonObject(text));
}

function applyDuplicateRisk(
  lead: ScoredCsvLead,
  context: Awaited<ReturnType<typeof loadCsvContext>>,
  seenInRun: Set<string>
) {
  const runKeys = [
    rootDomain(lead.website),
    normalizeCompanyName(lead.companyName),
    lead.officialEmail.toLowerCase()
  ].filter(Boolean);
  const existing = context.existing.leads.find((stored) => {
    const sameDomain = stored.domain && runKeys.includes(stored.domain);
    const sameEmail = stored.email && runKeys.includes(stored.email);
    const sameName = normalizeCompanyName(stored.companyName) === normalizeCompanyName(lead.companyName);
    return sameDomain || sameEmail || sameName;
  });
  const duplicateInRun = runKeys.some((key) => seenInRun.has(key));

  if (!existing && !duplicateInRun) {
    return { lead, runKeys };
  }

  return {
    lead: {
      ...lead,
      duplicateRisk: "high" as const,
      contactStatus: existing?.contacted ? "already_contacted" : "already_stored_or_duplicate",
      warnings: [
        ...lead.warnings,
        existing
          ? `Duplicate against existing lead ${existing.companyName}.`
          : "Duplicate inside this CSV import."
      ].slice(0, 10)
    },
    runKeys
  };
}

async function saveScoredLead(lead: ScoredCsvLead, context: Awaited<ReturnType<typeof loadCsvContext>>) {
  const notes = `manual_csv_lead_import:${JSON.stringify(lead)}`;
  const leadRecord = await prisma.lead.create({
    data: {
      productId: context.productRecord.id,
      companyName: lead.companyName,
      website: lead.website,
      city: lead.city,
      country: "Sweden",
      industry: lead.businessType,
      segment: lead.companySizeEstimate,
      sourceUrl: lead.website,
      fitScore: lead.fitScore,
      confidenceLevel: lead.fitScore >= 90 ? "high" : "medium",
      reasonForFit: lead.reasonForSelection,
      officialEmail: lead.officialEmail,
      emailConfidence: "medium",
      contactStatus: "not_contacted",
      tags: ["manual-csv", context.product.slug, lead.duplicateRisk],
      bestEntryAngle: lead.whyTheyMightPay,
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes
    }
  });

  const outreachDraft = await prisma.outreachDraft.create({
    data: {
      productId: context.productRecord.id,
      leadId: leadRecord.id,
      company: lead.companyName,
      subject: lead.proposedEmailSubject,
      opening: lead.personalizationNotes,
      observation: lead.visiblePainPoints.join("; "),
      opportunity: lead.whyTheyMightPay,
      productConnection: `${context.product.name}: ${context.product.positioning}`,
      softCta: context.product.cta,
      closing: "Vänliga hälsningar, Smart Art AI Solutions",
      language: "sv",
      tone: context.product.preferredTone.join(", "),
      complianceChecklist: [
        "مصدر CSV يدوي",
        "لا يوجد إرسال تلقائي",
        "موافقة المالك مطلوبة",
        "تم فحص الرسائل الخاصة بالمنتج"
      ],
      bodyPreview: lead.proposedEmailBody,
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes
    }
  });

  const approval = await prisma.approvalItem.create({
    data: {
      productId: context.productRecord.id,
      leadId: leadRecord.id,
      itemType: "manual_csv_lead_outreach",
      itemId: outreachDraft.id,
      contentPreview: `${lead.companyName}: ${lead.proposedEmailSubject} (${lead.fitScore}% fit)`,
      riskWarnings: [
        `duplicate_risk: ${lead.duplicateRisk}`,
        `acceptance_likelihood: ${lead.acceptanceLikelihood}%`,
        "لا يوجد إرسال تلقائي",
        "يجب أن يثق المالك يدويًا بمصدر البريد من CSV",
        ...lead.warnings
      ].slice(0, 10),
      complianceChecklist: [
        "تم التحقق من حقول CSV المطلوبة",
        "مسودة بريد سويدية مخصصة",
        "موافقة المالك اليدوية مطلوبة",
        "approved_by_owner ما زال false"
      ],
      finalStatus: "manual_execution_required",
      status: "owner_review",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `manual_csv_lead_import:${leadRecord.id}`
    }
  });

  return { leadRecord, outreachDraft, approval };
}

function reportMarkdown(input: {
  productName: string;
  summary: string;
  outreachLearning: string;
  saved: ScoredCsvLead[];
  rejected: RejectedCsvRow[];
  warnings: string[];
}) {
  return [
    `# Manual CSV Lead Import: ${input.productName}`,
    "",
    `Summary: ${input.summary}`,
    "",
    "السلامة:",
    "- لم يتم إرسال أي بريد.",
    "- لم يتم التواصل مع أي شركة.",
    "- لم تتم الموافقة تلقائيًا على أي عميل.",
    "- تم حفظ الصفوف المقبولة كمراجعة مالك فقط.",
    "",
    "## Learning From Previous Outreach",
    input.outreachLearning,
    "",
    "## Saved Leads",
    ...(input.saved.length
      ? input.saved.map((lead) => `- ${lead.companyName}: fit ${lead.fitScore}, duplicate ${lead.duplicateRisk}`)
      : ["- None."]),
    "",
    "## Rejected Rows",
    ...(input.rejected.length
      ? input.rejected.map((row) => `- Row ${row.rowNumber} ${row.companyName || "(unknown)"}: ${row.reason}`)
      : ["- None."]),
    "",
    "## Warnings",
    ...(input.warnings.length ? input.warnings.map((warning) => `- ${warning}`) : ["- None."])
  ].join("\n");
}

export async function importManualCsvLeads(input: {
  productSlug: ProductSlug;
  csvText: string;
}) {
  const productSlug = productSlugSchema.parse(input.productSlug);
  const context = await loadCsvContext(productSlug);
  const parsedCsv = csvToObjects(input.csvText);
  const rejected: RejectedCsvRow[] = [...parsedCsv.rejected];
  const rowsForScoring = parsedCsv.rows.filter((row) => {
    const rowText = JSON.stringify(row).toLowerCase();
    const blocked = forbiddenTermsByProduct[productSlug].filter((term) =>
      rowText.includes(term.toLowerCase())
    );

    if (blocked.length > 0) {
      rejected.push({
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        reason: `Rejected before AI scoring because row appears outside ${context.product.name} context: ${blocked.join(", ")}.`
      });
      return false;
    }

    return true;
  });
  const saved: ScoredCsvLead[] = [];
  let summary = "CSV parsed but no rows were scored.";
  let outreachLearning = "No AI scoring was completed.";
  let warnings: string[] = [];

  if (!isOpenAiTextConfigured()) {
    rejected.push(
      ...rowsForScoring.map((row) => ({
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        reason: "OpenAI text configuration is missing. The app did not guess fit scores or draft emails."
      }))
    );
    warnings = ["OpenAI text configuration is missing. No leads were saved."];
  } else if (rowsForScoring.length === 0) {
    warnings = ["No valid CSV rows were available for scoring."];
  } else {
    const output = await callOpenAiForCsvLeads(context, rowsForScoring);
    const normalizedOutput = scoredCsvOutputSchema.parse({
      ...output,
      productSlug,
      leads: output.leads.map((lead) => ({ ...lead, productSlug }))
    });
    assertProductSeparation(normalizedOutput);
    summary = normalizedOutput.summary;
    outreachLearning = normalizedOutput.outreachLearning;
    warnings = normalizedOutput.warnings;

    const seenInRun = new Set<string>();

    for (const rawLead of normalizedOutput.leads) {
      const { lead, runKeys } = applyDuplicateRisk(rawLead, context, seenInRun);
      assertProductSeparation(scoredCsvOutputSchema.parse({ ...normalizedOutput, leads: [lead] }));

      if (lead.fitScore < 80) {
        rejected.push({
          rowNumber: parsedCsv.rows.find((row) => row.companyName === lead.companyName)?.rowNumber ?? 0,
          companyName: lead.companyName,
          reason: `Rejected by fit score ${lead.fitScore}; minimum is 80.`
        });
        continue;
      }

      if (lead.duplicateRisk === "high") {
        rejected.push({
          rowNumber: parsedCsv.rows.find((row) => row.companyName === lead.companyName)?.rowNumber ?? 0,
          companyName: lead.companyName,
          reason: lead.warnings.join("; ") || "خطر التكرار مرتفع."
        });
        continue;
      }

      await saveScoredLead(lead, context);
      runKeys.forEach((key) => seenInRun.add(key));
      saved.push(lead);
    }
  }

  const markdown = reportMarkdown({
    productName: context.product.name,
    summary,
    outreachLearning,
    saved,
    rejected,
    warnings
  });

  const report = await prisma.report.create({
    data: {
      productId: context.productRecord.id,
      type: "lead_quality_report",
      title: `Manual CSV lead import: ${context.product.name}`,
      summary,
      whatWasDone: [
        "Parsed owner-provided CSV.",
        "Validated required fields.",
        "Checked duplicates by company name, domain, and email.",
        "Saved only approval-gated leads and email drafts."
      ],
      numbers: {
        validRows: parsedCsv.rows.length,
        rejectedRows: rejected.length,
        savedLeads: saved.length
      },
      whatWorked: saved.map((lead) => `${lead.companyName}: ${lead.fitScore}% fit`),
      whatDidNotWork: rejected.map((row) => `Row ${row.rowNumber}: ${row.reason}`),
      recommendations: [
        "Review every imported lead and draft email before manual use.",
        "Verify CSV official emails against company sources before outreach."
      ],
      nextWeekPlan: saved.map((lead) => `Review ${lead.companyName} in Approval Center`),
      markdown,
      status: "draft",
      approved_by_owner: false,
      manual_execution_required: true,
      notes: `manual_csv_lead_import:${productSlug}`
    }
  });

  return {
    reportId: report.id,
    savedCount: saved.length,
    rejectedCount: rejected.length
  };
}
