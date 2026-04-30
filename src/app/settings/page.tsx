import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/section-page";
import { getDatabaseStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const databaseStatus = await getDatabaseStatus();

  return (
    <AppShell>
      <SettingsSection databaseStatus={databaseStatus} />
    </AppShell>
  );
}
