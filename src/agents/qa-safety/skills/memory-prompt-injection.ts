import type { ProductSlug } from "@/lib/product-data";
import { injectMemory, memoryToPromptBlock, type MemorySnippets } from "../../core/memory";

export interface MemoryPromptResult {
  block: string;
  snippets: MemorySnippets;
}

export async function buildMemoryPrompt(
  slug: ProductSlug | undefined
): Promise<MemoryPromptResult> {
  const snippets = await injectMemory(slug);
  return { block: memoryToPromptBlock(snippets), snippets };
}
