import { Hono } from "hono";
import {
  createApiKeyRequestSchema,
  type CreateApiKeyResponse,
  type DeleteApiKeyResponse,
  type ListApiKeysResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import {
  createWorkspaceApiKey,
  listWorkspaceApiKeys,
  revokeWorkspaceApiKey,
} from "../../services/keys/api-keys";
import type { AppEnv } from "../../types";

export const apiKeysRouter = new Hono<AppEnv>();
apiKeysRouter.use(requireAuth);

// POST /api/keys
apiKeysRouter.post("/", async (c) => {
  const body = createApiKeyRequestSchema.parse(await c.req.json());
  const { key, secret } = await createWorkspaceApiKey(c.get("workspaceId"), body);
  const response: CreateApiKeyResponse = { key, secret };
  return c.json(response, 201);
});

// GET /api/keys
apiKeysRouter.get("/", async (c) => {
  const keys = await listWorkspaceApiKeys(c.get("workspaceId"));
  const response: ListApiKeysResponse = { keys };
  return c.json(response);
});

// DELETE /api/keys/:id
apiKeysRouter.delete("/:id", async (c) => {
  await revokeWorkspaceApiKey(c.get("workspaceId"), c.req.param("id"));
  const response: DeleteApiKeyResponse = { id: c.req.param("id"), revoked: true };
  return c.json(response);
});
