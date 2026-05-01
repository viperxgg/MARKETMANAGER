import { prisma } from "@/lib/db";
import type { ProductSlug } from "@/lib/product-data";
import type { MemoryReference } from "./types";

export interface MemorySnippet {
  id: string;
  title: string;
  insight: string;
}

export interface MemorySnippets {
  winning: MemorySnippet[];
  weak: MemorySnippet[];
  references: MemoryReference[];
}

const EMPTY: MemorySnippets = { winning: [], weak: [], references: [] };

/**
 * Pulls owner-approved AgencyMemory items for the product, scoped to winning/weak messages.
 * Always returns a result — DB errors degrade silently to empty memory rather than crashing the agent path.
 */
export async function injectMemory(productSlug: ProductSlug | undefined): Promise<MemorySnippets> {
  if (!productSlug) return EMPTY;
  if (!process.env.DATABASE_URL) return EMPTY;

  try {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
      select: { id: true }
    });
    if (!product) return EMPTY;

    const items = await prisma.agencyMemory.findMany({
      where: {
        productId: product.id,
        approved_by_owner: true,
        category: { in: ["winning_messages", "weak_messages"] }
      },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: { id: true, title: true, insight: true, category: true }
    });

    const winning = items.filter((i) => i.category === "winning_messages").slice(0, 3);
    const weak = items.filter((i) => i.category === "weak_messages").slice(0, 3);

    return {
      winning: winning.map((i) => ({ id: i.id, title: i.title, insight: i.insight })),
      weak: weak.map((i) => ({ id: i.id, title: i.title, insight: i.insight })),
      references: items.map((i) => ({ id: i.id, category: i.category }))
    };
  } catch {
    return EMPTY;
  }
}

export function memoryToPromptBlock(memory: MemorySnippets): string {
  if (memory.winning.length === 0 && memory.weak.length === 0) return "";
  const lines: string[] = ["", "## Memory context (mandatory):"];
  if (memory.winning.length) {
    lines.push("Winning messages — emulate tone and structure:");
    memory.winning.forEach((m) => lines.push(`- ${m.title}: ${m.insight}`));
  }
  if (memory.weak.length) {
    lines.push("Weak messages — avoid these patterns:");
    memory.weak.forEach((m) => lines.push(`- ${m.title}: ${m.insight}`));
  }
  return lines.join("\n");
}
