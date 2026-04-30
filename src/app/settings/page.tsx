import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/section-page";
import { getDatabaseStatus } from "@/lib/db";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const databaseStatus = await getDatabaseStatus();
  const integrationStatus = {
    openAiTextConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
    openAiImageConfigured: Boolean(
      process.env.OPENAI_API_KEY && (process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_GENERATION_MODEL)
    ),
    imageStorageConfigured: Boolean(process.env.IMAGE_STORAGE_PROVIDER && process.env.IMAGE_STORAGE_BUCKET),
    leadProviderStatus: getLeadSearchProviderStatus()
  };

  return (
    <AppShell>
      <SettingsSection databaseStatus={databaseStatus} integrationStatus={integrationStatus} />
    </AppShell>
  );
}
