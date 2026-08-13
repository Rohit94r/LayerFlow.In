import { Hono } from "hono";
import { improvePromptRequestSchema, type ImprovePromptResponse } from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rate-limit";
import { improvePrompt } from "../../services/improve/improve";
import type { AppEnv } from "../../types";

export const improveRouter = new Hono<AppEnv>();
improveRouter.use(requireAuth);
// Improve runs a paid LLM call per request.
improveRouter.use("/", rateLimit({ requestsPerMinute: 20, keyFn: (c) => String(c.get("userId")) }));

// POST /api/improve — improve a rough prompt into a sharp, low-token prompt.
improveRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = improvePromptRequestSchema.parse(await c.req.json());

  const result = await improvePrompt({
    workspaceId,
    userId,
    content: body.content,
    targetModel: body.targetModel,
  });

  const response: ImprovePromptResponse = result;
  return c.json(response);
});
