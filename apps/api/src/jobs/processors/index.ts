import type { Job } from "bullmq";
import type { JobName } from "../queues";
import { processBudgetAlerts } from "./budget-alerts";
import { processCompare } from "./compare";
import { processEmbeddings } from "./embed";
import { processExample } from "./example";
import { processUsageRollup } from "./usage-rollup";
import { processWeeklyDigest } from "./weekly-digest";

export type JobProcessor = (job: Job) => Promise<void>;

/** Map job name → processor. The worker dispatches by job.name. */
export const processors: Partial<Record<JobName, JobProcessor>> = {
  example: processExample,
  compare: processCompare,
  embeddings: processEmbeddings,
  "usage-rollup": processUsageRollup,
  "budget-alerts": processBudgetAlerts,
  "weekly-digest": processWeeklyDigest,
};
