import { marketingStrategistAgent } from "../marketing-strategist/strategist-agent";
import { qaSafetyAgent } from "../qa-safety/qa-agent";
import { hasAgent, registerAgent } from "./registry";

let booted = false;

/**
 * Idempotent. Registers every agent once. Called automatically by `runAgent()`.
 * Adding a new agent? Import it here and add a registerAgent line.
 */
export function bootstrapAgents(): void {
  if (booted) return;
  if (!hasAgent(qaSafetyAgent.id)) registerAgent(qaSafetyAgent);
  if (!hasAgent(marketingStrategistAgent.id)) registerAgent(marketingStrategistAgent);
  booted = true;
}
