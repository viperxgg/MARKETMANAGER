import type { ProductSlug } from "@/lib/product-data";

/**
 * Single source of truth for product-level forbidden terms.
 * Previously duplicated across:
 *   - src/lib/content-studio.ts
 *   - src/lib/product-content-studio.ts
 *   - src/lib/facebook-image-assets.ts
 *   - src/lib/live-lead-research.ts
 *
 * Migration path: those files should import from here. Until they do, keep this list
 * a strict superset of every other forbidden-term list to avoid behavioural regressions.
 */
export const FORBIDDEN_TERMS: Record<ProductSlug, string[]> = {
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
    "restaurant",
    "restaurang",
    "waiter",
    "kitchen",
    "kitchen flow",
    "alcohol",
    "food ordering"
  ]
};

export function getForbiddenTerms(slug: ProductSlug): string[] {
  return FORBIDDEN_TERMS[slug] ?? [];
}
