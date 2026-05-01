import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { ProductWorkspace } from "@/components/product-workspace";
import { getProductWorkspace } from "@/lib/data-service";
import { products } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string; showDismissed?: string; runId?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await getProductWorkspace(slug, {
    showDismissed: query.showDismissed === "1"
  });

  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <Notice code={query.notice} runId={query.runId} />
      <ProductWorkspace data={data} />
    </AppShell>
  );
}
