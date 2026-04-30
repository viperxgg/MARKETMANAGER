import { z } from "zod";

export const productSlugSchema = z.enum(["nord-smart-menu", "stadsync-ai"]);
export const agencyBrainScopeSchema = z.enum(["global", "nord-smart-menu", "stadsync-ai"]);
export const agencyBrainObjectiveSchema = z.enum([
  "daily_review",
  "campaign_idea",
  "outreach_idea",
  "social_idea",
  "lead_research_direction",
  "duplicate_check",
  "messaging_review"
]);

export const runTodaySchema = z.object({
  productSlug: productSlugSchema.optional()
});

export const writePostSchema = z.object({
  productSlug: productSlugSchema
});

export const leadResearchSchema = z.object({
  productSlug: productSlugSchema,
  targetCount: z.coerce.number().int().min(1).max(20).default(20)
});

export const campaignBriefSchema = z.object({
  productSlug: productSlugSchema,
  targetSegment: z.string().min(2).max(160),
  objective: z.string().min(2).max(240),
  channel: z.enum(["facebook", "instagram", "linkedin", "email", "manual", "codex_research"]),
  messageAngle: z.string().min(2).max(240)
});

export const manualMetricSchema = z.object({
  productSlug: productSlugSchema.optional(),
  company: z.string().max(160).default(""),
  campaignId: z.string().optional(),
  channel: z.enum(["facebook", "instagram", "linkedin", "email", "manual"]),
  metricDate: z.string().min(1),
  subject: z.string().max(200).default(""),
  impressions: z.coerce.number().int().min(0).default(0),
  clicks: z.coerce.number().int().min(0).default(0),
  replies: z.coerce.number().int().min(0).default(0),
  meetingsBooked: z.coerce.number().int().min(0).default(0),
  conversions: z.coerce.number().int().min(0).default(0),
  bookings: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(1000).default("")
});

export const approvalDecisionSchema = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(["approve", "request_revision", "reject", "mark_reviewed"])
});

export const approveAndPublishFacebookSchema = z.object({
  approvalId: z.string().min(1),
  returnTo: z.string().min(1).max(300).default("/approval-center")
});

export const confidenceSchema = z.enum(["unknown", "low", "medium", "high"]);

export const importLeadSchema = z.object({
  productSlug: productSlugSchema,
  campaignId: z.string().optional(),
  companyName: z.string().min(2).max(180),
  website: z.string().url(),
  city: z.string().min(2).max(120),
  industry: z.string().min(2).max(120),
  segment: z.string().min(2).max(160),
  sourceUrl: z.string().url(),
  fitScore: z.coerce.number().int().min(0).max(100),
  confidenceLevel: confidenceSchema.default("medium"),
  reasonForFit: z.string().min(10).max(1000),
  officialEmail: z.string().email().optional(),
  emailSourceUrl: z.string().url().optional(),
  emailSourcePage: z.string().max(120).optional(),
  emailConfidence: confidenceSchema.default("unknown"),
  bestEntryAngle: z.string().min(5).max(500),
  tags: z.string().max(300).default("")
});

export const websiteAnalysisSchema = z.object({
  leadId: z.string().min(1),
  menuServiceClarity: z.coerce.number().int().min(0).max(10),
  customerJourney: z.coerce.number().int().min(0).max(10),
  mobileExperience: z.coerce.number().int().min(0).max(10),
  bookingContactClarity: z.coerce.number().int().min(0).max(10),
  visualClarity: z.coerce.number().int().min(0).max(10),
  trustSignals: z.coerce.number().int().min(0).max(10),
  conversionFriction: z.string().min(5).max(1000),
  opportunityFraming: z.string().min(5).max(1000),
  productFitReason: z.string().min(5).max(1000),
  confidenceLevel: confidenceSchema.default("medium")
});

export const contactVerificationSchema = z.object({
  leadId: z.string().min(1),
  officialEmail: z.string().email(),
  emailSourceUrl: z.string().url(),
  emailSourcePage: z.string().min(2).max(120),
  emailConfidence: confidenceSchema.default("high"),
  notes: z.string().max(1000).default("")
});

export const outreachDraftSchema = z.object({
  leadId: z.string().min(1),
  subject: z.string().min(2).max(180),
  opening: z.string().min(2).max(500),
  observation: z.string().min(2).max(800),
  opportunity: z.string().min(2).max(800),
  productConnection: z.string().min(2).max(800),
  softCta: z.string().min(2).max(300),
  closing: z.string().min(2).max(300),
  optOutText: z.string().max(300).default(""),
  bodyPreview: z.string().max(2000).default("")
});

export const socialDraftSchema = z.object({
  productSlug: productSlugSchema,
  campaignId: z.string().optional(),
  platform: z.enum(["facebook", "instagram", "linkedin"]),
  campaignAngle: z.string().min(2).max(200),
  audience: z.string().min(2).max(160),
  postType: z.string().min(2).max(80),
  hook: z.string().min(2).max(200),
  body: z.string().min(5).max(2000),
  cta: z.string().min(2).max(300),
  hashtags: z.string().max(300).default(""),
  imageConcept: z.string().min(2).max(500),
  imagePromptEn: z.string().min(5).max(1200),
  visualAvoid: z.string().max(500).default("")
});

export const experimentSchema = z.object({
  productSlug: productSlugSchema,
  campaignId: z.string().optional(),
  hypothesis: z.string().min(10).max(1000),
  segment: z.string().min(2).max(160),
  channel: z.enum(["facebook", "instagram", "linkedin", "email", "manual", "codex_research"]),
  testSize: z.coerce.number().int().min(0).max(10000),
  variantA: z.string().min(2).max(1000),
  variantB: z.string().min(2).max(1000),
  metric: z.string().min(2).max(200)
});

export const memorySchema = z.object({
  productSlug: productSlugSchema.optional(),
  campaignId: z.string().optional(),
  title: z.string().min(2).max(180),
  category: z.enum([
    "winning_messages",
    "weak_messages",
    "best_segments",
    "poor_fit_segments",
    "objections",
    "successful_ctas",
    "bad_ctas",
    "visual_styles",
    "market_insights",
    "compliance_lessons",
    "pricing_feedback",
    "customer_language"
  ]),
  source: z.string().min(2).max(160),
  confidence: z.coerce.number().int().min(0).max(100),
  insight: z.string().min(5).max(1500),
  recommendation: z.string().min(5).max(1500)
});

export const reportSchema = z.object({
  productSlug: productSlugSchema.optional(),
  campaignId: z.string().optional(),
  type: z.enum([
    "weekly_campaign_report",
    "lead_quality_report",
    "outreach_performance_report",
    "social_content_report",
    "product_positioning_report",
    "monthly_learning_report"
  ]),
  title: z.string().min(2).max(180),
  summary: z.string().min(5).max(1500),
  whatWasDone: z.string().max(2000).default(""),
  whatWorked: z.string().max(2000).default(""),
  whatDidNotWork: z.string().max(2000).default(""),
  recommendations: z.string().max(2000).default(""),
  nextWeekPlan: z.string().max(2000).default("")
});

export const agencyBrainRunSchema = z.object({
  scope: agencyBrainScopeSchema,
  objective: agencyBrainObjectiveSchema
});

export const agencyBrainRecommendationSchema = z.object({
  type: z.string().min(2).max(80),
  title: z.string().min(2).max(180),
  description: z.string().min(5).max(1500),
  targetAudience: z.string().min(2).max(220),
  channel: z.string().min(2).max(80),
  duplicateRisk: z.enum(["low", "medium", "high"]),
  similarityNotes: z.string().min(2).max(1000),
  nextStep: z.enum(["create_new", "revise_existing", "skip"]),
  requiresApproval: z.boolean()
});

export const agencyBrainMemoryUpdateSchema = z.object({
  type: z.string().min(2).max(80),
  title: z.string().min(2).max(180),
  content: z.string().min(5).max(1500),
  confidence: z.coerce.number().int().min(0).max(100)
});

export const agencyBrainOutputSchema = z.object({
  scope: agencyBrainScopeSchema,
  productSlug: productSlugSchema.nullable(),
  objective: agencyBrainObjectiveSchema,
  summary: z.string().min(5).max(1500),
  reasoning: z.string().min(5).max(2500),
  recommendations: z.array(agencyBrainRecommendationSchema).max(8),
  memoryUpdates: z.array(agencyBrainMemoryUpdateSchema).max(6),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

export type AgencyBrainOutput = z.infer<typeof agencyBrainOutputSchema>;

export const facebookContentStudioOutputSchema = z.object({
  productSlug: productSlugSchema,
  platform: z.literal("facebook"),
  language: z.literal("sv"),
  postText: z.string().min(20).max(2200),
  strategicReason: z.string().min(5).max(1200),
  targetAudience: z.string().min(2).max(220),
  contentAngle: z.string().min(2).max(180),
  duplicateRisk: z.enum(["low", "medium", "high"]),
  similarityNotes: z.string().min(2).max(1000),
  imageConcept: z.string().min(2).max(500),
  imagePrompt: z.string().min(10).max(1500),
  imageUrl: z.string().max(50000).nullable(),
  requiresApproval: z.literal(true),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

export type FacebookContentStudioOutput = z.infer<typeof facebookContentStudioOutputSchema>;

export const facebookImageAssetOutputSchema = z.object({
  socialPostDraftId: z.string().min(1),
  productSlug: productSlugSchema,
  platform: z.literal("facebook"),
  imagePrompt: z.string().min(10).max(2000),
  imageModel: z.string().min(2).max(120),
  imageUrl: z.string().max(50000).nullable(),
  storedImageReference: z.string().max(50000).nullable(),
  status: z.literal("draft"),
  requiresApproval: z.literal(true),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

export type FacebookImageAssetOutput = z.infer<typeof facebookImageAssetOutputSchema>;

export const dismissCardSchema = z.object({
  itemType: z.string().min(2).max(120),
  itemId: z.string().min(1).max(260),
  productSlug: productSlugSchema.optional(),
  returnTo: z.string().min(1).max(500).default("/"),
  dismissReason: z.string().max(300).optional()
});

export const generateFacebookImageSchema = z.object({
  socialPostDraftId: z.string().min(1),
  returnTo: z.string().min(1).max(500).default("/social-studio")
});

export const liveLeadResearchLeadSchema = z.object({
  companyName: z.string().min(2).max(180),
  website: z.string().url(),
  officialEmail: z.string().email(),
  emailSource: z.string().url(),
  productSlug: productSlugSchema,
  fitScore: z.coerce.number().int().min(80).max(100),
  acceptanceLikelihood: z.coerce.number().int().min(0).max(100),
  companySizeEstimate: z.string().min(2).max(160),
  isNewOrRecentlyStarted: z.boolean(),
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

export const liveLeadResearchOutputSchema = z.object({
  productSlug: productSlugSchema,
  summary: z.string().min(5).max(1500),
  outreachLearning: z.string().min(5).max(1500),
  leads: z.array(liveLeadResearchLeadSchema).max(8),
  warnings: z.array(z.string().min(2).max(500)).max(10)
});

export type LiveLeadResearchLead = z.infer<typeof liveLeadResearchLeadSchema>;
export type LiveLeadResearchOutput = z.infer<typeof liveLeadResearchOutputSchema>;
