import type { Job } from "bullmq";
import type { JobName } from "../queues";
import { processAgent } from "./agent";
import { processAgentMaintenance } from "./agent-maintenance";
import { processAgentScheduled } from "./agent-scheduled";
import { processBudgetAlerts } from "./budget-alerts";
import { processCompare } from "./compare";
import { processEmbeddings } from "./embed";
import { processExample } from "./example";
import { processMemoryExtract } from "./memory-extract";
import { processRescue } from "./rescue";
import { processUsageRollup } from "./usage-rollup";
import { processWeeklyDigest } from "./weekly-digest";

export type JobProcessor = (job: Job) => Promise<void>;

/** Map job name → processor. The worker dispatches by job.name. */
export const processors: Partial<Record<JobName, JobProcessor>> = {
  example: processExample,
  compare: processCompare,
  embeddings: processEmbeddings,
  "memory-extract": processMemoryExtract,
  "usage-rollup": processUsageRollup,
  "budget-alerts": processBudgetAlerts,
  "weekly-digest": processWeeklyDigest,
  rescue: processRescue,
  agent: processAgent,
  "agent-maintenance": processAgentMaintenance,
  "agent-scheduled": processAgentScheduled,
};
