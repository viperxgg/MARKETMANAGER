import { AppShell } from "@/components/app-shell";
import { DashboardHome } from "@/components/dashboard-home";
import { Notice } from "@/components/notice";
import { SystemStatusPanel } from "@/components/system-status";
import { getDashboardData, normalizeProductFilter } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; product?: string; showDismissed?: string; runId?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(undefined, normalizeProductFilter(params.product), {
    showDismissed: params.showDismissed === "1"
  });

  return (
    <AppShell>
      <Notice code={params.notice} runId={params.runId} />
      <SystemStatusPanel />
      <DashboardHome data={data} />
    </AppShell>
  );
}
