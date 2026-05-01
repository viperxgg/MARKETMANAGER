import { z } from "zod";
import { createIssue, getLatestCommit, type CommitSummary, type CreatedIssue } from "./client";
import type { IntegrationCommand } from "../types";

export const latestCommitSchema = z.object({
  branch: z.string().min(1).max(120).default("main")
});

export const latestCommit: IntegrationCommand<
  z.infer<typeof latestCommitSchema>,
  CommitSummary
> = {
  id: "latest_commit",
  description: "Read the latest commit on a branch. Read-only, no approval required.",
  schema: latestCommitSchema,
  requiresApproval: false,
  async execute(input) {
    const data = await getLatestCommit(input.branch);
    return { success: true, data, externalId: data.sha };
  }
};

export const createIssueSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(8000),
  labels: z.array(z.string().min(1).max(50)).max(10).optional()
});

export const createIssueCommand: IntegrationCommand<
  z.infer<typeof createIssueSchema>,
  CreatedIssue
> = {
  id: "create_issue",
  description: "Open a GitHub issue in the configured repository. Requires owner approval.",
  schema: createIssueSchema,
  requiresApproval: true,
  async execute(input) {
    const data = await createIssue(input);
    return {
      success: true,
      data,
      externalId: String(data.number)
    };
  }
};
