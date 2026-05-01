import { dailyFocusPipeline } from "./pipelines/daily-focus";
import { leadResearchPipeline } from "./pipelines/lead-research";
import { registerWorkflow } from "./registry";

let booted = false;

/**
 * Idempotent. Registers every workflow once. Called automatically by `runWorkflow()`.
 * Adding a new workflow? Import it here and add a registerWorkflow line.
 */
export function bootstrapWorkflows(): void {
  if (booted) return;
  registerWorkflow(leadResearchPipeline);
  registerWorkflow(dailyFocusPipeline);
  booted = true;
}
