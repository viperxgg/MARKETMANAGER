import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { OutreachOperatingPage } from "@/components/operating-pages";
import { getOperatingData, normalizeProductFilter } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export default async function OutreachStudioPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; product?: string; showDismissed?: string }>;
}) {
  const params = await searchParams;
  const data = await getOperatingData(normalizeProductFilter(params.product), {
    showDismissed: params.showDismissed === "1"
  });

  return (
    <AppShell>
      <Notice code={params.notice} />
      <OutreachOperatingPage data={data} />
    </AppShell>
  );
}
