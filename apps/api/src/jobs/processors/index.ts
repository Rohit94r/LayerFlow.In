import type { Job } from "bullmq";
import type { JobName } from "../queues";
import { processCompare } from "./compare";
import { processEmbeddings } from "./embed";
import { processExample } from "./example";

export type JobProcessor = (job: Job) => Promise<void>;

/** Map job name → processor. The worker dispatches by job.name. */
export const processors: Partial<Record<JobName, JobProcessor>> = {
  example: processExample,
  compare: processCompare,
  embeddings: processEmbeddings,
  // "usage-rollup": processRollup,  (agent: cost)
};
