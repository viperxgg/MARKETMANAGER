import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/section-page";
import { getDatabaseStatus } from "@/lib/db";
import { getIntegrationsOverview } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [databaseStatus, integrations] = await Promise.all([
    getDatabaseStatus(),
    getIntegrationsOverview()
  ]);

  return (
    <AppShell>
      <SettingsSection databaseStatus={databaseStatus} integrations={integrations} />
    </AppShell>
  );
}
