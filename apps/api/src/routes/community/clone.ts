import { Hono } from "hono";
import type { ClonePromptResponse } from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { clonePrompt } from "../../services/community/clone";
import type { AppEnv } from "../../types";

/**
 * Mounted at /api/prompts so POST /api/prompts/:id/clone works.
 * (The prompts CRUD router may be owned by another agent — this only adds clone.)
 */
export const promptCloneRouter = new Hono<AppEnv>();
promptCloneRouter.use(requireAuth);

// POST /api/prompts/:id/clone
promptCloneRouter.post("/:id/clone", async (c) => {
  const result = await clonePrompt(
    c.get("workspaceId"),
    c.get("userId"),
    c.req.param("id"),
  );
  const response: ClonePromptResponse = result;
  return c.json(response, 201);
});
