import { z } from "zod";
import { isIntegrationEnabled } from "../flags";
import type { Integration, IntegrationCommand } from "../types";

interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

function getConfig(): VercelConfig | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID };
}

interface DeploymentSummary {
  uid: string;
  url: string;
  state: string;
  createdAt: number;
  source: string;
  target: string | null;
}

const latestDeploymentSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(1)
});

async function fetchDeployments(limit: number): Promise<DeploymentSummary[]> {
  const config = getConfig();
  if (!config) throw new Error("Vercel not configured");
  const params = new URLSearchParams({
    projectId: config.projectId,
    limit: String(limit)
  });
  if (config.teamId) params.set("teamId", config.teamId);

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vercel ${res.status}: ${body.slice(0, 200)}`);
  }
  const payload = (await res.json()) as {
    deployments?: Array<{
      uid: string;
      url: string;
      state: string;
      created: number;
      source: string;
      target: string | null;
    }>;
  };
  return (payload.deployments ?? []).map((d) => ({
    uid: d.uid,
    url: d.url,
    state: d.state,
    createdAt: d.created,
    source: d.source,
    target: d.target
  }));
}

const latestDeployment: IntegrationCommand<
  z.infer<typeof latestDeploymentSchema>,
  { deployments: DeploymentSummary[] }
> = {
  id: "latest_deployment",
  description: "Read the latest Vercel deployments for the configured project. Read-only.",
  schema: latestDeploymentSchema,
  requiresApproval: false,
  async execute(input) {
    const deployments = await fetchDeployments(input.limit);
    return {
      success: true,
      data: { deployments },
      externalId: deployments[0]?.uid
    };
  }
};

export const vercelIntegration: Integration = {
  id: "vercel",
  description: "Vercel deployment awareness (read-only).",
  async status() {
    const configured = getConfig() !== null;
    return {
      configured,
      enabled: isIntegrationEnabled("vercel"),
      detail: configured ? "VERCEL_TOKEN + VERCEL_PROJECT_ID present" : "missing Vercel credentials",
      missingEnvVars: configured ? [] : ["VERCEL_TOKEN", "VERCEL_PROJECT_ID"]
    };
  },
  commands: {
    [latestDeployment.id]: latestDeployment
  }
};
