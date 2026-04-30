import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/section-page";
import { getDatabaseStatus } from "@/lib/db";
import { getLeadSearchProviderStatus } from "@/lib/lead-search-provider";
import { isOpenAiImageConfigured, isOpenAiTextConfigured } from "@/lib/openai-config";
import { isFacebookPublishingConfigured } from "@/services/facebook-publisher";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const databaseStatus = await getDatabaseStatus();
  const integrationStatus = {
    openAiTextConfigured: isOpenAiTextConfigured(),
    openAiImageConfigured: isOpenAiImageConfigured(),
    facebookPublishingConfigured: isFacebookPublishingConfigured(),
    imageStorageConfigured: Boolean(process.env.IMAGE_STORAGE_PROVIDER && process.env.IMAGE_STORAGE_BUCKET),
    leadProviderStatus: getLeadSearchProviderStatus()
  };

  return (
    <AppShell>
      <SettingsSection databaseStatus={databaseStatus} integrationStatus={integrationStatus} />
    </AppShell>
  );
}
