import { AppShell } from "@/components/app-shell";
import { ProductsSection } from "@/components/section-page";
import { getProductsOverview } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const data = await getProductsOverview();

  return (
    <AppShell>
      <ProductsSection data={data} />
    </AppShell>
  );
}
