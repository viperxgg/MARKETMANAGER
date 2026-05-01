import { isGithubConfigured } from "./client";
import { createIssueCommand, latestCommit } from "./commands";
import { isIntegrationEnabled } from "../flags";
import type { Integration } from "../types";

export const githubIntegration: Integration = {
  id: "github",
  description: "GitHub repo awareness (read latest commit) + issue creation.",
  async status() {
    const configured = isGithubConfigured();
    return {
      configured,
      enabled: isIntegrationEnabled("github"),
      detail: configured
        ? `GITHUB_TOKEN + GITHUB_REPO present (${process.env.GITHUB_REPO})`
        : "missing GITHUB_TOKEN or GITHUB_REPO",
      missingEnvVars: configured ? [] : ["GITHUB_TOKEN", "GITHUB_REPO"]
    };
  },
  commands: {
    [latestCommit.id]: latestCommit,
    [createIssueCommand.id]: createIssueCommand
  }
};
