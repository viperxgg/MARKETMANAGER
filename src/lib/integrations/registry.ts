import type { Integration, IntegrationId } from "./types";

const map = new Map<IntegrationId, Integration>();

export function registerIntegration(integration: Integration): void {
  map.set(integration.id, integration);
}

export function getIntegration(id: IntegrationId): Integration | undefined {
  return map.get(id);
}

export function listIntegrations(): Integration[] {
  return Array.from(map.values());
}

export function hasIntegration(id: IntegrationId): boolean {
  return map.has(id);
}
