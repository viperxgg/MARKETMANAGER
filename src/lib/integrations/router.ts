/**
 * Lightweight intent → command router.
 *
 * The dispatcher is the strict contract. The router is a convenience layer for
 * "the user said something, route it" cases (typically from a chat UI or
 * an agent's `proposedNextAgents` chain).
 *
 * Deterministic keyword matching only. No LLM call here — keep this fast and
 * predictable. When ambiguity exists, an upstream agent should disambiguate first.
 */

interface IntentRule {
  match: RegExp;
  command: string;
  confidence: number;
}

const RULES: IntentRule[] = [
  { match: /\b(publish|post)\b.*\b(facebook|fb)\b/i, command: "facebook.publish_post", confidence: 0.95 },
  { match: /\b(facebook|fb)\b.*\b(publish|post)\b/i, command: "facebook.publish_post", confidence: 0.95 },
  { match: /\bsend\b.*\b(email|mail|outreach)\b/i, command: "email.send_email", confidence: 0.9 },
  { match: /\b(create|open)\b.*\b(github|issue)\b/i, command: "github.create_issue", confidence: 0.9 },
  { match: /\b(deployment|deploy)\b.*\bstatus\b/i, command: "vercel.latest_deployment", confidence: 0.9 },
  { match: /\b(find|search)\b.*\bleads?\b/i, command: "leads.search_companies", confidence: 0.85 }
];

export interface IntentMatch {
  command: string;
  confidence: number;
}

export function routeIntent(intent: string): IntentMatch | null {
  const hits = RULES.filter((r) => r.match.test(intent)).sort((a, b) => b.confidence - a.confidence);
  if (hits.length === 0) return null;
  return { command: hits[0].command, confidence: hits[0].confidence };
}
