import { listAgents } from "./registry";
import type { AgentId, AgentTask } from "./types";

export interface RouteDecision {
  primary: AgentId;
  candidates: AgentId[];
  confidence: number;
  reason: "fast-rule" | "self-vote" | "fallback";
}

interface FastRule {
  match: RegExp;
  agent: AgentId;
  confidence: number;
}

/**
 * Layer 1: deterministic, ~1ms, no LLM.
 * Order matters only for tie-breaking inside the same intent.
 */
const FAST_RULES: FastRule[] = [
  {
    match: /\b(architecture|refactor|schema|migration|deploy(ment)?|dependency|tech[- ]debt)\b/i,
    agent: "cto",
    confidence: 0.95
  },
  {
    match: /\b(lead|prospect|qualif(y|ied|ication)?|verify[- ]contact|csv|fit_score|fit score)\b/i,
    agent: "lead-gen",
    confidence: 0.95
  },
  {
    match: /\b(post|caption|copy(write)?|draft|image|visual|outreach|subject[- ]line)\b/i,
    agent: "content",
    confidence: 0.9
  },
  {
    match: /\b(campaign|strategy|messaging|angle|segment|daily[_ ]review|positioning)\b/i,
    agent: "marketing-strategist",
    confidence: 0.9
  },
  {
    match: /\b(report|analy[sz]e|performance|kpi|what[- ]worked|what[- ]failed|insight)\b/i,
    agent: "data-analyst",
    confidence: 0.9
  },
  {
    match: /\b(schedule|cron|recurring|automate|pipeline|job[- ]graph|background)\b/i,
    agent: "automation",
    confidence: 0.9
  }
];

const FALLBACK_AGENT: AgentId = "marketing-strategist";

export async function route(task: AgentTask): Promise<RouteDecision> {
  const haystack = `${task.intent} ${task.objective ?? ""}`;

  // 1. Fast rules
  const hits = FAST_RULES.filter((r) => r.match.test(haystack)).sort(
    (a, b) => b.confidence - a.confidence
  );

  if (hits.length === 1 && hits[0].confidence >= 0.8) {
    return {
      primary: hits[0].agent,
      candidates: [hits[0].agent],
      confidence: hits[0].confidence,
      reason: "fast-rule"
    };
  }
  if (hits.length >= 2) {
    const candidates = Array.from(new Set(hits.slice(0, 3).map((h) => h.agent)));
    return {
      primary: hits[0].agent,
      candidates,
      confidence: hits[0].confidence,
      reason: "fast-rule"
    };
  }

  // 2. Self-vote — every registered agent (except qa-safety) scores its fit.
  const agents = listAgents().filter((a) => a.id !== "qa-safety");
  const scores = agents
    .map((a) => ({ id: a.id, score: a.canHandle(task) }))
    .sort((a, b) => b.score - a.score);

  if (scores.length > 0 && scores[0].score >= 0.7) {
    const second = scores[1]?.score ?? 0;
    if (scores[0].score - second > 0.2) {
      return {
        primary: scores[0].id,
        candidates: [scores[0].id],
        confidence: scores[0].score,
        reason: "self-vote"
      };
    }
    return {
      primary: scores[0].id,
      candidates: scores.slice(0, 2).map((s) => s.id),
      confidence: scores[0].score,
      reason: "self-vote"
    };
  }

  // 3. Safe fallback. Prefer strategist if registered, else any registered agent.
  const fallback =
    agents.find((a) => a.id === FALLBACK_AGENT)?.id ?? agents[0]?.id ?? FALLBACK_AGENT;

  return {
    primary: fallback,
    candidates: [fallback],
    confidence: 0.4,
    reason: "fallback"
  };
}
