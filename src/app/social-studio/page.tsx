import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/notice";
import { SocialOperatingPage } from "@/components/operating-pages";
import { getOperatingData, normalizeProductFilter } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export default async function SocialStudioPage({
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
      <SocialOperatingPage data={data} />
    </AppShell>
  );
}
