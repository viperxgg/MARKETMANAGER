import { AppShell } from "@/components/app-shell";
import { DashboardHome } from "@/components/dashboard-home";
import { Notice } from "@/components/notice";
import { getDashboardData, normalizeProductFilter } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; product?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(undefined, normalizeProductFilter(params.product));

  return (
    <AppShell>
      <Notice code={params.notice} />
      <DashboardHome data={data} />
    </AppShell>
  );
}
