import type { ProductSlug } from "@/lib/product-data";
import { getForbiddenTerms } from "../forbidden-terms";

export function runForbiddenTermsCheck(text: string, slug: ProductSlug): string[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  return getForbiddenTerms(slug).filter((term) => haystack.includes(term.toLowerCase()));
}
