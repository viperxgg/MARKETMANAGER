/**
 * Lightweight heuristic — checks for Swedish characters and common stopwords.
 * Cheap and fast; an LLM-backed deep check can be added later if false positives appear.
 */
const SWEDISH_HINTS =
  /[åäöÅÄÖ]|\b(och|att|inte|för|med|som|jag|du|vi|ni|han|hon|det|den|här|där|men|kan|ska|har|är|var|vill|måste|finns|på|av)\b/i;

export interface LanguageCheck {
  isSwedish: boolean;
  reason: string;
}

export function runLanguageCheck(text: string): LanguageCheck {
  if (!text || text.length < 20) {
    return { isSwedish: true, reason: "too-short-to-check" };
  }
  const isSwedish = SWEDISH_HINTS.test(text);
  return {
    isSwedish,
    reason: isSwedish ? "ok" : "no Swedish characters or stopwords detected"
  };
}
