import type { ProductSlug } from "@/lib/product-data";

export type AgentId =
  | "cto"
  | "marketing-strategist"
  | "lead-gen"
  | "content"
  | "automation"
  | "qa-safety"
  | "data-analyst";

export interface AgentContext {
  productSlug?: ProductSlug;
  campaignId?: string;
  operator: { email: string };
  dbAvailable: boolean;
  dryRun: boolean;
}

export interface AgentTask<P extends Record<string, unknown> = Record<string, unknown>> {
  intent: string;
  objective?: string;
  payload?: P;
  context: AgentContext;
}

export interface MemoryReference {
  id: string;
  category: string;
}

export interface AgentCost {
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

/**
 * Optional persistence + safety directives an agent can attach to its result.
 * Read by qaPost (safety-gate) AFTER execution. Kept as a SIBLING of `output`
 * so concrete output types stay clean and don't have to declare these fields.
 */
export interface PersistableHints {
  persistAsApproval?: boolean;
  productId?: string;
  itemType?: string;
  itemId?: string;
  preview?: string;
  checklist?: string[];
  /** When true, qaPost runs the Swedish-language check on the output */
  expectsSwedish?: boolean;
}

export interface AgentResult<T = unknown> {
  agentId: AgentId;
  output: T;
  /** Optional. When present, the safety gate may persist an ApprovalItem and run language checks. */
  persist?: PersistableHints;
  confidence: number;
  usedMemory: MemoryReference[];
  warnings: string[];
  proposedNextAgents?: AgentId[];
  approvalItemId?: string;
  cost: AgentCost;
}

export interface Skill<I, O> {
  id: string;
  run(input: I, ctx: AgentContext): Promise<O>;
}

export interface Agent {
  id: AgentId;
  description: string;
  /** 0..1 self-confidence. Used by the router when fast rules don't match. */
  canHandle(task: AgentTask): number;
  execute(task: AgentTask): Promise<AgentResult>;
}

export const ZERO_COST: AgentCost = { inputTokens: 0, outputTokens: 0, usd: 0 };
